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
  inProgress: Segment[];
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  startBehavior: (behavior: string, time: number) => void;
  endBehavior: (behavior: string, time: number) => void;
  clearInProgress: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  inProgress: [],

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  startBehavior: (behavior: string, time: number) => {
    set({
      inProgress: [
        ...get().inProgress,
        { behavior, startTime: time, notes: "" },
      ],
    });
  },

  endBehavior: (behavior: string, time: number) => {
    set({
      inProgress: get().inProgress.map((seg) =>
        seg.behavior === behavior && seg.endTime === undefined
          ? { ...seg, endTime: time }
          : seg
      ),
    });
  },

  clearInProgress: () => {
    set({ inProgress: [] });
  },
}));
