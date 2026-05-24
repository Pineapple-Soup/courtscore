import { create } from "zustand";
import { Project, ProjectMember } from "@/types/project";

interface ProjectState {
  byId: Record<string, Project>;
  ids: string[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  createProject: (payload: Partial<Project>) => Promise<void>;
  updateProject: (payload: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchProject: () => Promise<void>;
  fetchProjectMembers: () => Promise<void>;
  fetchProjectVideos: () => Promise<void>;
  addProjectMember: (userId: string) => Promise<void>;
  removeProjectMember: (userId: string) => Promise<void>;
  linkProjectVideo: (videoId: string) => Promise<void>;
  unlinkProjectVideo: (videoId: string) => Promise<void>;
  setCurrentProject: (projectId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  byId: {},
  ids: [],
  currentProject: null,
  loading: false,
  error: null,

  createProject: async (payload: Partial<Project>) => {
    set({ loading: true, error: null });
    const tempId = `temp-${Date.now()}`;
    const tempProject = {
      ...(payload as Partial<Project>),
      id: tempId,
      created_at: new Date().toISOString(),
    } as Project;

    // optimistic append
    set((state) => ({
      byId: { ...state.byId, [tempId]: tempProject },
      ids: [tempId, ...state.ids],
    }));
    console.log(payload);
    try {
      const res = await fetch("http://localhost:8000/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();

      // replace temp entry with authoritative one
      set((state) => {
        const newById = { ...state.byId };
        delete newById[tempId];
        newById[created.id] = created;

        const newIds = state.ids.map((i) => (i === tempId ? created.id : i));
        // if created.id already exists elsewhere, dedupe
        const dedupedIds = Array.from(new Set(newIds));
        return { byId: newById, ids: dedupedIds };
      });

      set({ loading: false });
    } catch (err) {
      // rollback optimistic
      set((state) => {
        const newById = { ...state.byId };
        delete newById[tempId];
        return { byId: newById, ids: state.ids.filter((i) => i !== tempId) };
      });
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      throw err;
    }
  },

  updateProject: async (payload: Partial<Project>) => {
    const { currentProject } = get();
    if (!currentProject?.id) throw new Error("No current project selected");

    set({ loading: true, error: null });

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProject.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedProject: Project = await res.json();

      set((state) => ({
        byId: {
          ...state.byId,
          [updatedProject.id]: updatedProject,
        },
        ids: state.ids.includes(updatedProject.id)
          ? state.ids
          : [...state.ids, updatedProject.id],
        currentProject:
          state.currentProject?.id === updatedProject.id
            ? updatedProject
            : state.currentProject,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchProjects: async () => {
    set({ loading: true, error: null });

    try {
      const res = await fetch("http://localhost:8000/api/v1/projects", {
        credentials: "include",
      });
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
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchProject: async () => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set((state) => {
        const nextIds = state.ids.includes(currentProjectId)
          ? state.ids
          : [...state.ids, currentProjectId];
        return {
          byId: { ...state.byId, [currentProjectId]: data },
          ids: nextIds,
          currentProject:
            state.currentProject?.id === currentProjectId
              ? data
              : state.currentProject,
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchProjectVideos: async () => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}/videos`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set((state) => {
        const base =
          state.byId[currentProjectId] ??
          (state.currentProject?.id === currentProjectId
            ? state.currentProject
            : ({ id: currentProjectId } as Project));

        const updatedProject = {
          ...base,
          projectVideos: data,
        } as Project;

        return {
          byId: {
            ...state.byId,
            [currentProjectId]: updatedProject,
          },
          currentProject:
            state.currentProject?.id === currentProjectId
              ? updatedProject
              : state.currentProject,
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (projectId: string) => {
    set({ loading: true, error: null });

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set((state) => {
        const newById = { ...state.byId };
        delete newById[projectId];
        return { byId: newById, ids: state.ids.filter((i) => i !== projectId) };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchProjectMembers: async () => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}/members`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const projectMembers: ProjectMember[] = await res.json();
      set((state) => {
        const updatedProject = {
          ...state.byId[currentProjectId],
          projectMembers: projectMembers,
        } as Project;
        return {
          byId: {
            ...state.byId,
            [currentProjectId]: updatedProject,
          },
          currentProject:
            state.currentProject?.id === currentProjectId
              ? updatedProject
              : state.currentProject,
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  addProjectMember: async (userId: string) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}/members`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      if (!res.ok) {
        if (res.status === 409) {
          console.warn("User is already a member of this project.");
          return; // Exit gracefully
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const updatedProject: Project = await res.json();
      set((state) => ({
        byId: {
          ...state.byId,
          [currentProjectId]: updatedProject,
        },
        currentProject:
          state.currentProject?.id === currentProjectId
            ? updatedProject
            : state.currentProject,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      set({ loading: false });
    }
  },

  removeProjectMember: async (userId: string) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}/members/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedProject: Project = await res.json();
      set((state) => ({
        byId: {
          ...state.byId,
          [currentProjectId]: updatedProject,
        },
        currentProject:
          state.currentProject?.id === currentProjectId
            ? updatedProject
            : state.currentProject,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  linkProjectVideo: async (videoId: string) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}/videos`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedProject: Project = await res.json();
      set((state) => ({
        byId: {
          ...state.byId,
          [currentProjectId]: updatedProject,
        },
        currentProject:
          state.currentProject?.id === currentProjectId
            ? updatedProject
            : state.currentProject,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  unlinkProjectVideo: async (videoId: string) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error("No current project selected");
    set({ loading: true, error: null });

    try {
      const currentProjectId = currentProject.id;
      const res = await fetch(
        `http://localhost:8000/api/v1/projects/${currentProjectId}/videos`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedProject: Project = await res.json();
      set((state) => ({
        byId: {
          ...state.byId,
          [currentProjectId]: updatedProject,
        },
        currentProject:
          state.currentProject?.id === currentProjectId
            ? updatedProject
            : state.currentProject,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  setCurrentProject: (projectId: string | null) => {
    if (projectId === null) {
      set({ currentProject: null });
    } else {
      const { byId } = get();
      const project = byId[projectId];
      if (project) {
        set({ currentProject: project });
      } else {
        // If project not in store, create a placeholder to trigger fetching
        set({ currentProject: { id: projectId } as Project });
      }
    }
  },
}));

export default useProjectStore;
