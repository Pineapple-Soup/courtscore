"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Inbox } from "lucide-react";
import { AssignmentSummary } from "@/types/assignment";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { useUserStore } from "@/store/useUserStore";

const AssignmentList = () => {
  const currentUser = useUserStore((s) => s.currentUser);
  const setCurrent = useAssignmentStore((s) => s.actions.setCurrent);

  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);

  useEffect(() => {
    if (!currentUser) {
      console.error("No current user found. Cannot fetch assignments.");
      return;
    }
    const fetchMyAssignments = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/assignments", {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch assignments");
        }
        const data = await res.json();
        console.log("My Assignments:", data);
        setAssignments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      }
    };

    fetchMyAssignments();
  }, [currentUser]);

  if (!assignments || assignments.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-muted/10 text-muted-foreground'>
        <Inbox size={40} strokeWidth={1} />
        <p className='mt-4 text-xs font-bold uppercase tracking-widest'>
          No Assignments Found
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6'>
      {assignments.map((assignment: AssignmentSummary) => {
        return (
          <div
            key={assignment.id}
            className='group flex flex-col bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-main hover:border-secondary/50 transition-all duration-300'>
            <div className='relative aspect-video bg-muted flex items-end justify-between p-3'>
              <div
                className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border shadow-sm ${
                  assignment.status === "Not Started"
                    ? "bg-primary text-primary-foreground border-primary/20"
                    : assignment.status === "In Progress"
                      ? "bg-secondary text-secondary-foreground border-secondary/20"
                      : "bg-muted text-muted-foreground border-border"
                }`}>
                {assignment.status}
              </div>
            </div>

            <div className='p-4 space-y-4'>
              <div className='space-y-1'>
                <p className='text-[10px] font-mono text-muted-foreground tracking-tighter uppercase'>
                  {assignment.id}
                </p>
                {assignment.createdAt && (
                  <p className='text-xs text-muted-foreground font-mono truncate'>
                    Assigned on:{" "}
                    {new Date(assignment.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className='flex items-center justify-between pt-2 border-t border-border/50'>
                <span>
                  <span className='text-xxs text-muted-foreground font-mono truncate'>
                    {assignment.projectName}
                  </span>
                </span>
                <a
                  href={`/annotate/${assignment.id}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={() => setCurrent(assignment.id)}
                  className='flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all active:scale-95'>
                  Open
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AssignmentList;
