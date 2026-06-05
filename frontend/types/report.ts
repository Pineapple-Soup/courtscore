export interface FlaggedBehavior {
  behaviorName: string;
  threshold: number;
  counts: number[];
  difference: number;
}

export interface AssignmentReport {
  assignmentId: string;
  userId: string;
  userName: string;
  status: string;
  updatedAt?: Date;
  segmentCounts: Record<string, number>;
}

export interface ProjectVideoReport {
  videoId: string;
  videoLabel: string;
  assignments: AssignmentReport[];
  flags: FlaggedBehavior[];
}
