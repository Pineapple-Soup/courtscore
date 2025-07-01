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
    set((state) => ({
      segments: state.segments.map((segment) => {
        if (segment.behavior === behavior && segment.endTime === null) {
          return { ...segment, endTime: time };
        } else {
          return segment;
        }
      }),
    }));
  },

  clearInProgress: () => {
    set({ segments: [] });
  },
}));
