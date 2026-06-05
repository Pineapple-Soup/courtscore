"use client";

import { useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { BehaviorStatus } from "@/types/behavior";
import { Segment } from "@/types/segment";
import Modal from "@/components/Modal";

interface SegmentModalProps {
  segment: Segment;
  onClose: () => void;
}

const SegmentModal = ({ segment, onClose }: SegmentModalProps) => {
  const segments = useAnnotationStore((s) => s.segments);
  const duration = useAnnotationStore((s) => s.duration);
  const isPlaying = useAnnotationStore((s) => s.isPlaying);
  const setSegments = useAnnotationStore((s) => s.setSegments);
  const mergeSegments = useAnnotationStore((s) => s.mergeSegments);
  const getBehaviorStatus = useAnnotationStore((s) => s.getBehaviorStatus);
  const [notes, setNotes] = useState<string>(segment.notes || "");
  const [startTime, setStartTime] = useState<number>(segment.startTime);
  const [endTime, setEndTime] = useState<number | null>(segment.endTime);

  const handleDelete = () => {
    const updatedSegments = segments.filter((s) => s !== segment);
    setSegments(updatedSegments);
    onClose();
  };

  const handleSave = () => {
    if (isPlaying) {
      alert("Cannot edit segments while the video is playing.");
      return;
    }

    if (startTime < 0) {
      alert("Start time cannot be negative.");
      return;
    }

    if (endTime !== null && endTime < startTime) {
      alert("End time cannot be earlier than start time.");
      return;
    }

    if (
      endTime === null &&
      segment.endTime !== null &&
      getBehaviorStatus(segment.behavior) === BehaviorStatus.ACTIVE
    ) {
      alert(
        `Existing ${
          segment.behavior.name
        } segment already active. Please specify an end time`,
      );
      return;
    }

    if (notes.length > 500) {
      alert("Notes cannot exceed 500 characters.");
      return;
    }

    const updatedSegment: Segment = {
      ...segment,
      notes,
      startTime: Number(startTime),
      endTime: endTime !== null ? Math.min(Number(endTime), duration) : null,
    };

    let updatedSegments = segments.filter((s) => s !== segment);
    if (endTime !== null) {
      updatedSegments = mergeSegments(updatedSegments, updatedSegment);
    } else {
      updatedSegments = updatedSegments.concat(updatedSegment);
    }

    setSegments(updatedSegments);
    onClose();
  };

  return (
    <Modal title='Edit Segment' onClose={onClose}>
      <div className='space-y-6'>
        <div className='text-center'>
          <h2 className='text-lg font-bold uppercase tracking-widest text-foreground'>
            {segment.behavior.name}
          </h2>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <label
              htmlFor='startTime'
              className='text-xs font-bold uppercase text-muted-foreground'>
              Start Time (s)
            </label>
            <input
              id='startTime'
              type='number'
              required
              value={startTime}
              min={0}
              max={duration}
              onChange={(e) => {
                const value = e.target.value;
                const num = Number(value);
                setStartTime(Number(num.toFixed(2)));
              }}
              className='w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all'
              disabled={isPlaying}
            />
          </div>
          <div className='space-y-2'>
            <label
              htmlFor='endTime'
              className='text-xs font-bold uppercase text-muted-foreground'>
              End Time (s)
            </label>
            <input
              id='endTime'
              type='number'
              value={endTime === null ? "" : endTime}
              required
              min={0}
              max={duration}
              placeholder='In-Progress'
              onChange={(e) => {
                const value = e.target.value;
                setEndTime(
                  value === "" ? null : Number(Number(value).toFixed(2)),
                );
              }}
              className='w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all'
              disabled={isPlaying}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='notes'
            className='text-xs font-bold uppercase text-muted-foreground'>
            Notes
          </label>
          <textarea
            id='notes'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className='w-full p-2 border border-input rounded-md shadow-sm bg-background min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all'
            disabled={isPlaying}
            placeholder='Add optional notes...'
          />
        </div>

        <div className='flex justify-between items-center pt-4 border-t border-border'>
          <button
            className='px-5 py-2 bg-destructive/10 border border-destructive/50 text-destructive text-xs font-bold uppercase tracking-widest rounded hover:bg-destructive hover:text-destructive-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            onClick={handleDelete}
            disabled={isPlaying}>
            Delete
          </button>
          <div className='flex gap-2'>
            <button
              className='px-3 py-2 text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors'
              onClick={onClose}>
              Cancel
            </button>
            <button
              className='px-5 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-main hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              onClick={handleSave}
              disabled={isPlaying}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SegmentModal;
