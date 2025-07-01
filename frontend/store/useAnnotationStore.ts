import { create } from "zustand";

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
  clearInProgress: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
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
    set((state) => ({
      segments: [
        ...state.segments,
        { behavior, startTime: time, endTime: null },
      ],
    }));
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

  clearInProgress: () => {
    set({ segments: [] });
  },
}));
