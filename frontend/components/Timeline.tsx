"use client";

import { useRef, useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Behavior } from "@/types/behavior";
import { Segment } from "@/types/segment";
import Modal from "@/components/Modal";
import SegmentModal from "@/components/SegmentModal";

const Timeline = () => {
  const currentTime = useAnnotationStore((s) => s.currentTime);
  const isPlaying = useAnnotationStore((s) => s.isPlaying);
  const duration = useAnnotationStore((s) => s.duration);
  const segments = useAnnotationStore((s) => s.segments);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showPlaybackWarning, setShowPlayWarning] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

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
    <div className='flex flex-col w-full'>
      <div className='grid grid-cols-3 font-semibold'>
        <h3 className='place-self-start'> {currentTime} seconds </h3>
        <h3 className='place-self-center'> Timeline </h3>
        <h3 className='place-self-end'>
          {duration === 0
            ? "0%"
            : `${((currentTime / duration) * 100).toFixed(1)}%`}
        </h3>
      </div>
      <div ref={timelineRef} className='relative flex flex-col rounded'>
        {Object.values(Behavior)
          .filter((value) => typeof value === "number")
          .map((id) => (
            <div
              key={id}
              className='relative h-8 border rounded bg-neutral-200'
              title={`${Behavior[id]}`}>
              <div>
                {segments
                  .filter((seg) => seg.behavior === id)
                  .map((segment, index) => {
                    const startPercent = (segment.startTime / duration) * 100;
                    const endPercent =
                      ((segment.endTime !== null
                        ? segment.endTime
                        : currentTime) /
                        duration) *
                      100;
                    const widthPercent = endPercent - startPercent;
                    if (widthPercent === 0) {
                      return (
                        <div
                          key={index}
                          onClick={() => handleSegmentClick(segment)}
                          className='absolute top-0 h-full flex items-center justify-center cursor-pointer'
                          style={{ left: `${startPercent}%` }}>
                          <span className='w-2 h-2 rounded-full bg-blue-500' />
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={index}
                          onClick={() => handleSegmentClick(segment)}
                          className={`absolute top-0 h-full bg-blue-500 rounded cursor-pointer ${
                            segment.endTime === null ? "animate-pulse" : ""
                          }`}
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        />
                      );
                    }
                  })}
              </div>
              <div
                className='absolute top-0 h-full w-0.5 bg-red-500'
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
