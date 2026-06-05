"use client";

import { useEffect, useState } from "react";
import { Inbox, Download } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { AssignmentSummary } from "@/types/assignment";
import { ProjectVideoReport } from "@/types/report";
import { VideoStatus } from "@/types/video";
import SystemLoading from "@/components/SystemLoading";

const ProjectInfo = () => {
  const currentProject = useProjectStore((s) => s.currentProject);

  const [projectVideoReport, setProjectVideoReport] = useState<
    ProjectVideoReport[]
  >([]);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProject || loading) return;
    const loadProjectVideos = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/projects/${currentProject.id}/videos/detail`,
          {
            credentials: "include",
          },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch report");
        }

        const reportData: ProjectVideoReport[] = await res.json();
        setProjectVideoReport(reportData);
      } catch (error) {
        console.error(error);
      }
    };

    const loadAssignments = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/projects/${currentProject.id}/assignments`,
          {
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAssignments(data);
      } catch (err) {
        console.error("Failed to load assignments:", err);
      }
    };

    loadProjectVideos();
    loadAssignments();
  }, [currentProject, loading]);

  const handleCreateAssignments = async () => {
    if (!currentProject || loading) return;
    if (assignments.length > 0) {
      console.error("Assignments already exist for this project");
      return;
    }
    if (currentProject.projectMembers.length === 0) {
      alert(
        "Please add at least one member to the project before creating assignments.",
      );
      return;
    }
    if (currentProject.projectVideos.length === 0) {
      alert(
        "Please link at least one video to the project before creating assignments.",
      );
      return;
    }
    if (currentProject.behaviors.length === 0) {
      alert("Please add at least one behavior before creating assignments.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProject.id}/assignments`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Assignments created successfully.");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to create assignments",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetAssignments = async () => {
    if (!currentProject || loading) return;
    const ok = window.confirm(
      "This will delete all assignments for this project. This cannot be undone. Continue?",
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProject.id}/assignments`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Assignments reset successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset assignments");
    } finally {
      setLoading(false);
    }
  };

  const exportVideoAssignments = (video: ProjectVideoReport) => {
    const assignmentIds = video.assignments.map((a) => a.assignmentId);
    assignmentIds.forEach(async (id) => {
      const url = `http://localhost:8000/api/v1/assignments/${id}/export`;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) {
        alert(`Failed to export assignment ${id}`);
        return;
      }
      const blob = await res.blob();
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = `assignment_${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
    });
  };

  if (loading) {
    return (
      <SystemLoading message='Loading project report and assignments...' />
    );
  }

  return (
    <div className='mb-8 space-y-8'>
      <div>
        {projectVideoReport.length === 0 ? (
          <div className='border rounded-lg p-6 text-muted-foreground'>
            No linked videos found for this project. Please link videos to see
            the report.
          </div>
        ) : (
          <div className='border rounded-lg overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='text-left p-4'>Video</th>
                  <th className='text-left p-4'>Annotators</th>
                  <th className='text-left p-4'>Flags</th>
                  <th className='text-left p-4'>Status</th>
                  <th className='text-left p-4'>Actions</th>
                </tr>
              </thead>

              {projectVideoReport.map((video) => (
                <tbody key={video.videoId}>
                  <tr
                    key={video.videoId}
                    className='border-t cursor-pointer hover:bg-muted/30'
                    onClick={() =>
                      setExpandedVideo(
                        expandedVideo === video.videoId ? null : video.videoId,
                      )
                    }>
                    <td className='p-4 font-medium'>{video.videoLabel}</td>

                    <td className='p-4'>{video.assignments.length}</td>

                    <td className='p-4'>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          video.flags.length > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                        {video.flags.length}
                      </span>
                    </td>

                    <td className='p-4'>
                      {video.assignments.every(
                        (a) => a.status === VideoStatus.COMPLETED,
                      )
                        ? "Completed"
                        : video.assignments.some(
                              (a) => a.status === VideoStatus.IN_PROGRESS,
                            )
                          ? "In Progress"
                          : "Not Started"}
                    </td>

                    <td className='p-4'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportVideoAssignments(video);
                        }}
                        disabled={
                          video.assignments.length === 0 ||
                          video.assignments.some(
                            (a) => a.status !== VideoStatus.COMPLETED,
                          )
                        }
                        className='inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-bold bg-primary text-primary-foreground cursor-pointer hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all'>
                        <Download size={14} />
                        Export
                      </button>
                    </td>
                  </tr>

                  {expandedVideo === video.videoId && (
                    <tr>
                      {video.assignments.length === 0 ? (
                        <td colSpan={5} className='p-4'>
                          No assignments found
                        </td>
                      ) : (
                        <td colSpan={5} className='bg-muted/20 border-t w-full'>
                          <div className='p-4 space-y-4'>
                            <div>
                              <h4 className='font-medium mb-2'>
                                Annotator Results
                              </h4>

                              <div className='overflow-x-auto'>
                                <table className='w-full text-sm'>
                                  <thead>
                                    <tr className='border-b'>
                                      <th className='text-left py-2'>
                                        Annotator
                                      </th>

                                      <th className='text-left py-2'>
                                        Last Updated
                                      </th>

                                      {Object.keys(
                                        video.assignments[0]?.segmentCounts ??
                                          {},
                                      ).map((behavior) => (
                                        <th
                                          key={behavior}
                                          className='text-left py-2'>
                                          {behavior}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {video.assignments.map((assignment) => (
                                      <tr
                                        key={assignment.assignmentId}
                                        className='border-b'>
                                        <td className='py-2'>
                                          {assignment.userName}
                                        </td>

                                        <td className='py-2'>
                                          {assignment.updatedAt
                                            ? new Date(
                                                assignment.updatedAt,
                                              ).toLocaleString()
                                            : "N/A"}
                                        </td>

                                        {Object.keys(
                                          assignment.segmentCounts,
                                        ).map((behavior) => (
                                          <td key={behavior} className='py-2'>
                                            {assignment.segmentCounts[behavior]}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {video.flags.length > 0 && (
                              <div>
                                <h4 className='font-medium mb-2 text-primary'>
                                  Flagged Behaviors
                                </h4>

                                <div className='space-y-1 text-sm'>
                                  {video.flags.map((flag) => (
                                    <div key={flag.behaviorName}>
                                      <strong>{flag.behaviorName}</strong>
                                      {" — "}
                                      Difference: {
                                        flag.difference
                                      } (Threshold: {flag.threshold})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </div>

      <div className='mt-8 rounded-xl border bg-card shadow-main overflow-hidden'>
        <div className='flex items-center justify-between border-b bg-muted/30 px-4 py-3'>
          <div>
            <h2 className='text-lg font-bold'>Project Assignments</h2>
            <p className='text-sm text-muted-foreground'>
              {assignments.length} assignments in {currentProject?.name}
            </p>
          </div>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={handleCreateAssignments}
              disabled={loading || assignments.length > 0}
              className='inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground shadow-main transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'>
              Create Assignments
            </button>
            <button
              type='button'
              onClick={handleResetAssignments}
              className='inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground shadow-main transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'>
              Reset Assignments
            </button>
          </div>
        </div>

        <div className='p-4'>
          {assignments.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-muted/10 text-muted-foreground'>
              <Inbox size={40} strokeWidth={1} />
              <p className='mt-4 text-xs font-bold uppercase tracking-widest'>
                No Assignments Found
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className='rounded-lg border bg-background p-4 shadow-sm transition-all hover:shadow-main'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <p className='font-mono text-sm'>
                        {assignment.videoLabel}
                      </p>
                    </div>
                    <span className='rounded-full border px-2 py-1 text-xxs font-bold uppercase tracking-widest'>
                      {assignment.status}
                    </span>
                  </div>

                  <div className='mt-4 text-sm text-muted-foreground'>
                    <p className='font-mono text-xs'>
                      Annotator: {assignment.userName}
                    </p>
                    <p className='font-mono text-xs'>
                      Created At:{" "}
                      {new Date(assignment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;
