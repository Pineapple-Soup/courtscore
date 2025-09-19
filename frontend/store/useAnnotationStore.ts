import { create } from "zustand";
import { Behavior } from "@/types/behavior";
import { Segment } from "@/types/segment";
import { Status } from "@/types/status";

interface AnnotationState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  segments: Segment[];
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setSegments: (segments: Segment[]) => void;
  startBehavior: (behavior: Behavior, time: number) => void;
  endBehavior: (behavior: Behavior, time: number) => void;
  getStatus: (behavior: Behavior) => Status;
  clearInProgress: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  segments: [],

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setDuration: (duration: number) => {
    set({ duration: duration });
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setSegments: (segments: Segment[]) => {
    set({ segments });
  },

  startBehavior: (behavior: Behavior, time: number) => {
    set((state) => {
      const isValid = !state.segments.some(
        (segment) =>
          segment.behavior === behavior &&
          segment.endTime !== null &&
          time >= segment.startTime &&
          time <= segment.endTime
      );

      if (!isValid) return state;

      return {
        segments: [
          ...state.segments,
          { behavior, startTime: time, endTime: null },
        ],
      };
    });
  },

  endBehavior: (behavior: Behavior, time: number) => {
    set((state) => {
      let updatedSegments = [...state.segments];
      const segmentIndex = state.segments.findIndex(
        (segment) => segment.behavior === behavior && segment.endTime === null
      );

      if (segmentIndex === -1) return state;

      const segment = state.segments[segmentIndex];
      if (time < segment.startTime) {
        console.warn("End time cannot be earlier than start time");
        updatedSegments.splice(segmentIndex, 1);
      } else {
        const overlappingIndices = state.segments
          .map((s, idx) =>
            s.behavior === behavior &&
            s.endTime !== null &&
            Math.max(segment.startTime, s.startTime) <=
              Math.min(time, s.endTime!)
              ? idx
              : -1
          )
          .filter((idx) => idx !== -1);

        if (overlappingIndices.length > 0) {
          const overlappingSegments = overlappingIndices.map(
            (idx) => state.segments[idx]
          );
          const allSegments = [segment, ...overlappingSegments];
          const mergedSegment: Segment = {
            behavior,
            startTime: Math.min(...allSegments.map((s) => s.startTime)),
            endTime: Math.max(time, ...allSegments.map((s) => s.endTime!)),
            notes:
              allSegments
                .map((s) => s.notes)
                .filter(Boolean)
                .join(" | ") || undefined,
          };
          updatedSegments = updatedSegments.filter(
            (_, idx) =>
              idx !== segmentIndex && !overlappingIndices.includes(idx)
          );
          updatedSegments.push(mergedSegment);
        } else {
          updatedSegments[segmentIndex] = {
            ...segment,
            endTime: time,
          };
        }
      }

      return { segments: updatedSegments };
    });
  },

  getStatus: (behavior: Behavior): Status => {
    const { segments, currentTime } = get();

    const relevantSegments = segments.filter(
      (segment: Segment) => segment.behavior === behavior
    );

    if (
      relevantSegments.some(
        (segment: Segment) =>
          segment.endTime === null && segment.startTime <= currentTime
      )
    ) {
      return Status.ACTIVE;
    }

    if (
      relevantSegments.some(
        (segment: Segment) =>
          segment.endTime !== null &&
          segment.startTime <= currentTime &&
          segment.endTime! >= currentTime
      )
    ) {
      return Status.COMPLETE;
    }

    return Status.EMPTY;
  },

  clearInProgress: () => {
    set({ segments: [] });
  },
}));
