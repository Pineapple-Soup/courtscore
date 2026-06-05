import { create } from "zustand";

interface AssignmentState {
  currentAssignmentId: string | null;
  actions: {
    setCurrent: (id: string) => void;
    resetCurrent: () => void;
  };
}

export const useAssignmentStore = create<AssignmentState>((set) => ({
  currentAssignmentId: null,

  actions: {
    setCurrent: (id: string) => {
      set({ currentAssignmentId: id });
    },

    resetCurrent: () => {
      set({ currentAssignmentId: null });
    },
  },
}));

export default useAssignmentStore;
