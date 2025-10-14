"use client";

import { useCallback, useEffect } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Behavior } from "@/types/behavior";
import { Status } from "@/types/status";

const BehaviorToggles = () => {
  const currentTime = useAnnotationStore((s) => s.currentTime);
  const segments = useAnnotationStore((s) => s.segments);
  const startBehavior = useAnnotationStore((s) => s.startBehavior);
  const endBehavior = useAnnotationStore((s) => s.endBehavior);
  const getStatus = useAnnotationStore((s) => s.getStatus);

  const toggleBehavior = useCallback(
    (behavior: Behavior) => {
      const activeSegment = segments.find(
        (segment) => segment.behavior === behavior && segment.endTime === null
      );
      if (!activeSegment) {
        startBehavior(behavior, currentTime);
      } else {
        endBehavior(behavior, currentTime);
      }
    },
    [segments, currentTime, startBehavior, endBehavior]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key: number = parseInt(e.key);
      if (!isNaN(key) && key >= 1 && key <= 6) {
        toggleBehavior(key as Behavior);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleBehavior]);

  return (
    <div className='flex flex-col w-full'>
      <h3 className='flex justify-center font-semibold'>Behaviors</h3>
      <div className='flex flex-col gap-4'>
        {Object.values(Behavior)
          .filter((value) => typeof value === "number")
          .map((id) => (
            <div
              key={id}
              className='flex justify-center items-center gap-4 min-w-fit'>
              <p>[{id}]</p>
              <button
                onClick={() => toggleBehavior(id as Behavior)}
                disabled={getStatus(id as Behavior) === Status.COMPLETE}
                className={`flex items-center justify-center w-full h-8 border-2 border-neutral-500 rounded-lg cursor-pointer ${
                  getStatus(id as Behavior) === Status.ACTIVE
                    ? "bg-blue-500 text-white"
                    : getStatus(id as Behavior) === Status.EMPTY
                    ? "bg-white"
                    : "bg-gray-500 !cursor-not-allowed"
                }`}>
                {Behavior[id]}
              </button>
              <p>
                {segments.filter((segment) => segment.behavior === id).length}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BehaviorToggles;
