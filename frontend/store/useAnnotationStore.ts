import { create } from "zustand";

type Segment = {
  behavior: string;
  startTime: number;
  endTime?: number;
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
    set({
      segments: [...get().segments, { behavior, startTime: time }],
    });
  },

  endBehavior: (behavior: string, time: number) => {
    set({
      segments: get().segments.map((segment) =>
        segment.behavior === behavior && segment.endTime === undefined
          ? { ...segment, endTime: time }
          : segment
      ),
    });
  },

  clearInProgress: () => {
    set({ segments: [] });
  },
}));
