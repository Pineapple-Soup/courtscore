from itertools import combinations
from uuid import uuid4
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import ProjectMember, ProjectVideo, Assignment


def get_pair_counts(db: Session, project_id: str, exclude_user_id: str | None = None) -> dict[frozenset[str], int]:
    """
    Build a frequency matrix of how many times each pair of members has worked together.
    
    Args:
        db: Database session
        project_id: Project to analyze
        exclude_user_id: Optional user to exclude (for redistribution after removal)
    
    Returns:
        Dictionary mapping frozenset({user_id_1, user_id_2}) to count
    """
    # Get all video assignments for this project
    query = (
        db.query(Assignment.project_video_id, Assignment.user_id)
        .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
        .filter(ProjectVideo.project_id == project_id)
    )
    
    if exclude_user_id:
        query = query.filter(Assignment.user_id != exclude_user_id)
    
    assignments = query.all()
    
    # Group by project_video_id
    video_assignees: dict[str, list[str]] = {}
    for pv_id, user_id in assignments:
        if pv_id not in video_assignees:
            video_assignees[pv_id] = []
        video_assignees[pv_id].append(user_id)
    
    # Count pairs
    pair_counts: dict[frozenset[str], int] = {}
    for assignees in video_assignees.values():
        for pair in combinations(sorted(assignees), 2):
            pair_key = frozenset(pair)
            pair_counts[pair_key] = pair_counts.get(pair_key, 0) + 1
    
    return pair_counts


def get_workload(db: Session, project_id: str, exclude_user_id: str | None = None) -> dict[str, int]:
    """
    Get the number of videos assigned to each member in a project.
    
    Args:
        db: Database session
        project_id: Project to analyze
        exclude_user_id: Optional user to exclude
    
    Returns:
        Dictionary mapping user_id to assignment count
    """
    query = (
        db.query(Assignment.user_id, func.count(Assignment.id).label("count"))
        .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
        .filter(ProjectVideo.project_id == project_id)
    )
    
    if exclude_user_id:
        query = query.filter(Assignment.user_id != exclude_user_id)
    
    results = query.group_by(Assignment.user_id).all()
    
    return {user_id: count for user_id, count in results}


def get_project_member_ids(db: Session, project_id: str, exclude_owners: bool = False) -> list[str]:
    """
    Get all member user IDs for a project.
    
    Args:
        db: Database session
        project_id: Project to query
        exclude_owners: If True, only return members with role='member'
    
    Returns:
        List of user IDs
    """
    query = db.query(ProjectMember.user_id).filter(ProjectMember.project_id == project_id)
    
    if exclude_owners:
        query = query.filter(ProjectMember.role == "member")
    
    return [row[0] for row in query.all()]


def score_combination(
    combo: tuple[str, ...],
    pair_counts: dict[frozenset[str], int],
    workload: dict[str, int]
) -> tuple[int, int]:
    """
    Score a combination of members for assignment.
    
    Lower score is better:
    - Primary: Sum of pair frequencies (prefer members who haven't worked together)
    - Secondary: Max workload in combo (prefer balanced distribution)
    
    Args:
        combo: Tuple of user_ids
        pair_counts: Current pair frequency matrix
        workload: Current workload per member
    
    Returns:
        Tuple of (pair_score, workload_score)
    """
    # Sum of pair frequencies
    pair_score = 0
    for pair in combinations(combo, 2):
        pair_key = frozenset(pair)
        pair_score += pair_counts.get(pair_key, 0)
    
    # Max workload in this combination
    workload_score = max((workload.get(uid, 0) for uid in combo), default=0)
    
    return (pair_score, workload_score)


def select_assignees(
    member_ids: list[str],
    n: int,
    pair_counts: dict[frozenset[str], int],
    workload: dict[str, int],
    excluded_users: set[str] | None = None
) -> list[str]:
    """
    Select N members to assign to a video, minimizing pair frequency and balancing workload.
    
    Args:
        member_ids: All available member IDs
        n: Number of annotators to assign
        pair_counts: Current pair frequency matrix (will be updated in place)
        workload: Current workload per member (will be updated in place)
        excluded_users: Users already assigned to this video (for redistribution)
    
    Returns:
        List of N user_ids to assign
    
    Raises:
        ValueError: If not enough members available
    """
    # Filter out excluded users
    available = [m for m in member_ids if m not in (excluded_users or set())]
    
    if len(available) < n:
        raise ValueError(f"Need at least {n} members, have {len(available)} available")
    
    # Generate all possible combinations
    all_combos = list(combinations(available, n))
    
    # Select combination with lowest score
    best_combo = min(all_combos, key=lambda c: score_combination(c, pair_counts, workload))
    
    # Update pair counts
    for pair in combinations(best_combo, 2):
        pair_key = frozenset(pair)
        pair_counts[pair_key] = pair_counts.get(pair_key, 0) + 1
    
    # Update workload
    for uid in best_combo:
        workload[uid] = workload.get(uid, 0) + 1
    
    return list(best_combo)


def assign_video(
    db: Session,
    project_video_id: str,
    project_id: str,
    n: int,
    pair_counts: dict[frozenset[str], int] | None = None,
    workload: dict[str, int] | None = None
) -> list[Assignment]:
    """
    Assign N members to a single video using balanced pairing.
    
    Args:
        db: Database session
        project_video_id: The ProjectVideo to assign
        project_id: Parent project ID
        n: Number of annotators per video
        pair_counts: Optional pre-computed pair counts (for batch operations)
        workload: Optional pre-computed workload (for batch operations)
    
    Returns:
        List of created VideoAssignment objects
    """
    # Get or compute pair counts and workload
    if pair_counts is None:
        pair_counts = get_pair_counts(db, project_id)
    if workload is None:
        workload = get_workload(db, project_id)
    
    # Get all project members (including owners who can also annotate)
    member_ids = get_project_member_ids(db, project_id)
    
    # Select best assignees
    selected = select_assignees(member_ids, n, pair_counts, workload)
    
    # Create assignments
    assignments = []
    for user_id in selected:
        assignment = Assignment(
            id=str(uuid4()),
            project_video_id=project_video_id,
            user_id=user_id
        )
        db.add(assignment)
        assignments.append(assignment)
    
    return assignments


def assign_videos_batch(
    db: Session,
    project_video_ids: list[str],
    project_id: str,
    n: int
) -> dict[str, list[Assignment]]:
    """
    Assign members to multiple videos with balanced pairing.
    
    Processes videos sequentially to maintain accurate pair counts.
    
    Args:
        db: Database session
        project_video_ids: List of ProjectVideo IDs to assign
        project_id: Parent project ID
        n: Number of annotators per video
    
    Returns:
        Dictionary mapping project_video_id to list of VideoAssignment objects
    """
    # Pre-compute pair counts and workload once
    pair_counts = get_pair_counts(db, project_id)
    workload = get_workload(db, project_id)
    
    result: dict[str, list[Assignment]] = {}
    
    for pv_id in project_video_ids:
        assignments = assign_video(db, pv_id, project_id, n, pair_counts, workload)
        result[pv_id] = assignments
    
    return result


def get_current_assignees(db: Session, project_video_id: str) -> list[str]:
    """
    Get user IDs currently assigned to a project video.
    
    Args:
        db: Database session
        project_video_id: The ProjectVideo to query
    
    Returns:
        List of user_ids
    """
    return [
        row[0] for row in 
        db.query(Assignment.user_id)
        .filter(Assignment.project_video_id == project_video_id)
        .all()
    ]


def redistribute_after_removal(
    db: Session,
    project_id: str,
    removed_user_id: str,
    n: int
) -> dict[str, str]:
    """
    Reassign videos that were assigned to a removed member.
    
    Args:
        db: Database session
        project_id: Project ID
        removed_user_id: User being removed
        n: Annotators per video (to verify we need replacement)
    
    Returns:
        Dictionary mapping project_video_id to new user_id assigned
    """
    # Get all project videos where removed user was assigned
    affected_pv_ids = [
        row[0] for row in
        db.query(Assignment.project_video_id)
        .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
        .filter(
            ProjectVideo.project_id == project_id,
            Assignment.user_id == removed_user_id
        )
        .all()
    ]
    
    if not affected_pv_ids:
        return {}
    
    # Delete assignments for removed user
    db.query(Assignment).filter(
        Assignment.project_video_id.in_(affected_pv_ids),
        Assignment.user_id == removed_user_id
    ).delete(synchronize_session=False)
    
    # Build pair counts and workload excluding removed user
    pair_counts = get_pair_counts(db, project_id, exclude_user_id=removed_user_id)
    workload = get_workload(db, project_id, exclude_user_id=removed_user_id)
    
    # Get remaining members
    remaining_members = [
        m for m in get_project_member_ids(db, project_id)
        if m != removed_user_id
    ]
    
    reassignments: dict[str, str] = {}
    
    for pv_id in affected_pv_ids:
        # Get current assignees (after removal)
        current_assignees = set(get_current_assignees(db, pv_id))
        
        # Find candidates (not already assigned)
        candidates = [m for m in remaining_members if m not in current_assignees]
        
        if not candidates:
            # No one available to reassign - skip this video
            continue
        
        # Score candidates based on pair frequency with existing assignees and workload
        def score_candidate(candidate: str) -> tuple[int, int]:
            pair_score = 0
            for existing in current_assignees:
                pair_key = frozenset({candidate, existing})
                pair_score += pair_counts.get(pair_key, 0)
            workload_score = workload.get(candidate, 0)
            return (pair_score, workload_score)
        
        best_replacement = min(candidates, key=score_candidate)
        
        # Create new assignment
        new_assignment = Assignment(
            id=str(uuid4()),
            project_video_id=pv_id,
            user_id=best_replacement
        )
        db.add(new_assignment)
        
        # Update tracking for subsequent iterations
        for existing in current_assignees:
            pair_key = frozenset({best_replacement, existing})
            pair_counts[pair_key] = pair_counts.get(pair_key, 0) + 1
        workload[best_replacement] = workload.get(best_replacement, 0) + 1
        
        reassignments[pv_id] = best_replacement
    
    return reassignments


def check_assignment_exists(db: Session, project_video_id: str, user_id: str) -> bool:
    """
    Check if a user is assigned to a specific project video.
    
    Args:
        db: Database session
        project_video_id: The ProjectVideo ID
        user_id: The user to check
    
    Returns:
        True if assignment exists
    """
    return db.query(Assignment).filter(
        Assignment.project_video_id == project_video_id,
        Assignment.user_id == user_id
    ).first() is not None


def get_user_assignments(db: Session, project_id: str, user_id: str) -> list[str]:
    """
    Get all project_video_ids assigned to a user within a project.
    
    Args:
        db: Database session
        project_id: Project to query
        user_id: User to query
    
    Returns:
        List of project_video_ids
    """
    return [
        row[0] for row in
        db.query(Assignment.project_video_id)
        .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
        .filter(
            ProjectVideo.project_id == project_id,
            Assignment.user_id == user_id
        )
        .all()
    ]
