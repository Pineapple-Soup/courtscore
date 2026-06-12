"use client";

import { useCallback, useEffect, useState } from "react";
import { Behavior, BehaviorStatus } from "@/types/behavior";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import api from "@/lib/api";

const BehaviorToggles = () => {
  const currentAssignmentId = useAssignmentStore((s) => s.currentAssignmentId);

  const currentTime = useAnnotationStore((s) => s.currentTime);
  const segments = useAnnotationStore((s) => s.segments);
  const startBehavior = useAnnotationStore((s) => s.startBehavior);
  const endBehavior = useAnnotationStore((s) => s.endBehavior);
  const getBehaviorStatus = useAnnotationStore((s) => s.getBehaviorStatus);

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);

  useEffect(() => {
    if (!currentAssignmentId) return;
    const fetchAssignmentContext = async () => {
      try {
        const data = await api.get<{ behaviors: Behavior[] }>(
          `/api/v1/assignments/${currentAssignmentId}/context`,
        );
        return data;
      } catch (err) {
        console.error(err);
        // Handle error (e.g. show notification)
      }
    };

    fetchAssignmentContext().then((context) => {
      if (context?.behaviors) {
        setBehaviors(context.behaviors);
      }
    });
  }, [currentAssignmentId]);

  const toggleBehavior = useCallback(
    (behavior: Behavior) => {
      const activeSegment = segments.find(
        (segment) => segment.behavior === behavior && segment.endTime === null,
      );
      if (!activeSegment) {
        startBehavior(behavior, currentTime);
      } else {
        endBehavior(behavior, currentTime);
      }
    },
    [segments, currentTime, startBehavior, endBehavior],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hotkey: string = e.key;
      console.log(`Key pressed: ${hotkey}`);
      console.log(
        `Available behaviors: ${behaviors.map((b) => b.hotkey).join(", ")}`,
      );
      const targetBehavior = behaviors.find((b) => b.hotkey === hotkey);
      if (targetBehavior) {
        toggleBehavior(targetBehavior);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [behaviors, toggleBehavior]);

  return (
    <div className='border rounded-xl bg-background shadow-main overflow-hidden h-full'>
      <div className='px-4 py-2 border-b bg-muted/30 flex justify-between items-center'>
        <span className='text-xxs font-bold uppercase tracking-wider'>
          Behaviors
        </span>
        <span className='h-2 w-2 rounded-full bg-primary' />
      </div>
      <div className='p-4 space-y-2'>
        {behaviors.map((behavior) => (
          <div
            key={behavior.name}
            className='flex justify-between items-center gap-2'>
            <span className='font-mono text-xs text-muted-foreground'>
              [{behavior.hotkey}]
            </span>
            <button
              onClick={() => toggleBehavior(behavior)}
              disabled={getBehaviorStatus(behavior) === BehaviorStatus.COMPLETE}
              className={`flex-grow h-9 px-3 rounded-md text-xs font-bold uppercase tracking-widest transition-all
                ${
                  getBehaviorStatus(behavior) === BehaviorStatus.ACTIVE
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : getBehaviorStatus(behavior) === BehaviorStatus.EMPTY
                      ? "border-2 border-border bg-transparent text-foreground hover:bg-muted"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}>
              {behavior.name}
            </button>
            <span className='font-mono text-xs text-muted-foreground w-6 text-center'>
              {
                segments.filter((segment) => segment.behavior === behavior)
                  .length
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BehaviorToggles;
