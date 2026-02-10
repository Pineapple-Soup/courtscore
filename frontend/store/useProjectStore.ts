import { create } from "zustand";
import { Project } from "@/types/project";

interface ProjectState {
  byId: Record<string, Project>;
  ids: string[];
  currentId?: string | null;
  loading: boolean;
  error?: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  setCurrent: (id?: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  byId: {},
  ids: [],
  currentId: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/projects", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const byId: Record<string, Project> = {};
      const ids: string[] = [];
      (data || []).forEach((p: Project) => {
        byId[p.id!] = p;
        ids.push(p.id!);
      });
      set({ byId, ids });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        byId: {},
        ids: [],
      });
    } finally {
      set({ loading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/v1/projects/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set((state) => ({
        byId: { ...state.byId, [id]: data },
        ids: state.ids.includes(id) ? state.ids : [...state.ids, id],
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      set({ loading: false });
    }
  },

  setCurrent: (id?: string | null) => set({ currentId: id ?? null }),
}));

export default useProjectStore;
