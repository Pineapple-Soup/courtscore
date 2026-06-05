"use client";

import { useEffect, useRef, useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { Behavior } from "@/types/behavior";
import { Segment } from "@/types/segment";
import Modal from "@/components/Modal";
import SegmentModal from "@/components/SegmentModal";

const Timeline = () => {
  const currentAssignmentId = useAssignmentStore((s) => s.currentAssignmentId);

  const currentTime = useAnnotationStore((s) => s.currentTime);
  const isPlaying = useAnnotationStore((s) => s.isPlaying);
  const duration = useAnnotationStore((s) => s.duration);
  const segments = useAnnotationStore((s) => s.segments);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showPlaybackWarning, setShowPlayWarning] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);

  useEffect(() => {
    if (!currentAssignmentId) return;
    const fetchAssignmentContext = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/assignments/${currentAssignmentId}/context`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error("Failed to fetch assignment context");
        }
        const data = await res.json();
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

  const handleSegmentClick = (segment: Segment) => {
    if (isPlaying) {
      setShowPlayWarning(true);
    } else {
      setSelectedSegment(segment);
    }
  };

  const closeWarningModal = () => {
    setShowPlayWarning(false);
  };

  const closeSegmentModal = () => {
    setSelectedSegment(null);
  };

  return (
    <div className='border rounded-xl bg-background shadow-main overflow-hidden'>
      <div className='px-4 py-2 border-b bg-muted/30 flex justify-between items-center'>
        <div className='flex items-baseline gap-2'>
          <span className='text-xxs font-bold uppercase tracking-wider'>
            Timeline
          </span>
          <span className='font-mono text-xs text-muted-foreground'>
            {currentTime.toFixed(2)}s
          </span>
        </div>
        <span className='font-mono text-xs text-muted-foreground'>
          {duration === 0
            ? "0.0%"
            : `${((currentTime / duration) * 100).toFixed(1)}%`}
        </span>
      </div>
      <div ref={timelineRef} className='p-4 space-y-1'>
        {behaviors.map((behavior) => (
          <div
            key={behavior.name}
            className='relative h-8 border border-border rounded-md bg-muted/40'
            title={`${behavior.name}`}>
            <div className='p-1 h-full'>
              {segments
                .filter((seg) => seg.behavior.name === behavior.name)
                .map((segment, index) => {
                  const startPercent = (segment.startTime / duration) * 100;
                  const endPercent =
                    ((segment.endTime !== null
                      ? segment.endTime
                      : currentTime) /
                      duration) *
                    100;
                  const widthPercent = endPercent - startPercent;

                  return (
                    <div
                      key={index}
                      onClick={() => handleSegmentClick(segment)}
                      className={`absolute top-0 h-full bg-primary/80 rounded-sm cursor-pointer transition-all duration-100 ease-linear hover:bg-primary ${
                        segment.endTime === null ? "animate-pulse" : ""
                      }`}
                      style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    />
                  );
                })}
            </div>
            <div
              className='absolute top-0 h-full w-0.5 bg-destructive'
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        ))}
      </div>
      {selectedSegment && (
        <SegmentModal segment={selectedSegment} onClose={closeSegmentModal} />
      )}
      {showPlaybackWarning && (
        <Modal title='Playback Warning' onClose={closeWarningModal}>
          <p className='my-2'>
            Cannot edit segements while the video is playing. Please pause the
            video and try again.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default Timeline;
