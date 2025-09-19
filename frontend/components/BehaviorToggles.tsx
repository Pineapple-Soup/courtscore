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
    <div className='flex flex-col w-full gap-4 items-center'>
      <h3 className='font-semibold'>Behaviors</h3>
      <div className='flex flex-col gap-8'>
        {Object.values(Behavior)
          .filter((value) => typeof value === "number")
          .map((id) => (
            <div key={id} className='flex items-center gap-4'>
              <p>[{id}]</p>
              <button
                onClick={() => toggleBehavior(id as Behavior)}
                disabled={getStatus(id as Behavior) === Status.COMPLETE}
                className={`flex flex-1 justify-center py-2 px-2 border rounded-lg cursor-pointer ${
                  getStatus(id as Behavior) === Status.ACTIVE
                    ? "bg-blue-500 text-white"
                    : getStatus(id as Behavior) === Status.EMPTY
                    ? "bg-white"
                    : "bg-gray-500 !cursor-not-allowed"
                }`}>
                {Behavior[id]}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BehaviorToggles;
