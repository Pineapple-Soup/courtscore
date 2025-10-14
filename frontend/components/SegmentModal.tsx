"use client";

import { useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Behavior } from "@/types/behavior";
import { Segment } from "@/types/segment";
import { Status } from "@/types/status";
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
  const getStatus = useAnnotationStore((s) => s.getStatus);
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
      getStatus(segment.behavior) === Status.ACTIVE
    ) {
      alert(
        `Existing ${
          Behavior[segment.behavior]
        } segment already active. Please specify an end time`
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
    <Modal title='Segment Details' onClose={onClose}>
      <h2 className='flex w-full items-center justify-center my-2 font-bold text-xl'>
        {Behavior[segment.behavior]}
      </h2>
      <div className='flex flex-col gap-4'>
        <div>
          <label htmlFor='startTime'>Start Time:</label>
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
            className='w-full p-2 border border-gray-300 rounded-md shadow-sm'
            disabled={isPlaying}
          />
        </div>
        <div>
          <label htmlFor='endTime'>End Time:</label>
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
                value === "" ? null : Number(Number(value).toFixed(2))
              );
            }}
            className='w-full p-2 border border-gray-300 rounded-md shadow-sm'
            disabled={isPlaying}
          />
        </div>
        <div>
          <label htmlFor='notes'>Notes:</label>
          <textarea
            id='notes'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className='w-full p-2 border border-gray-300 rounded-md shadow-sm'
            disabled={isPlaying}
          />
        </div>
        <div className='flex justify-between'>
          <button
            className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer'
            onClick={handleDelete}
            disabled={isPlaying}>
            Delete
          </button>
          <button
            className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer'
            onClick={handleSave}
            disabled={isPlaying}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SegmentModal;
