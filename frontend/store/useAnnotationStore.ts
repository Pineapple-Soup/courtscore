import { create } from "zustand";
import { Status } from "@/types/status";

type Segment = {
  behavior: string;
  startTime: number;
  endTime: number | null;
  notes?: string;
};

interface AnnotationState {
  currentTime: number;
  isPlaying: boolean;
  segments: Segment[];
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  startBehavior: (behavior: string, time: number) => void;
  endBehavior: (behavior: string, time: number) => void;
  getStatus: (behavior: string) => Status;
  clearInProgress: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  segments: [],

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  startBehavior: (behavior: string, time: number) => {
    set((state) => {
      const isValid = !state.segments.some(
        (segment) =>
          segment.behavior === behavior &&
          segment.endTime !== null &&
          time >= segment.startTime &&
          time <= segment.endTime
      );

      if (isValid) {
        return {
          segments: [
            ...state.segments,
            { behavior, startTime: time, endTime: null },
          ],
        };
      }

      return { segments: [...state.segments] };
    });
  },

  endBehavior: (behavior: string, time: number) => {
    set((state) => {
      const updatedSegments = [...state.segments];
      const segmentIndex = state.segments.findIndex(
        (segment) => segment.behavior === behavior && segment.endTime === null
      );

      if (segmentIndex !== -1) {
        const segment = state.segments[segmentIndex];
        if (time < segment.startTime) {
          console.warn("End time cannot be earlier than start time");
          updatedSegments.splice(segmentIndex, 1);
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

  getStatus: (behavior: string): Status => {
    const { segments, currentTime } = get();

    const relevantSegments = segments.filter(
      (segment: Segment) => segment.behavior === behavior
    );
    if (
      relevantSegments.some(
        (segment: Segment) =>
          segment.behavior === behavior &&
          segment.endTime !== null &&
          segment.startTime < currentTime &&
          segment.endTime > currentTime
      )
    ) {
      return Status.COMPLETE;
    } else if (
      relevantSegments.some(
        (segment: Segment) =>
          segment.behavior === behavior && segment.endTime === null
      )
    ) {
      return Status.ACTIVE;
    } else {
      return Status.EMPTY;
    }
  },

  clearInProgress: () => {
    set({ segments: [] });
  },
}));
