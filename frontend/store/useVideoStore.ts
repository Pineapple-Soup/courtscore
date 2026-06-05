import { create } from "zustand";
import { ProjectVideo } from "@/types/project";
import { Video } from "@/types/video";

declare global {
  interface VideoSearchCacheEntry {
    expiresAt: number;
    all: Video[];
  }
  /* eslint-disable no-var */
  var __videoSearchCache: Map<string, VideoSearchCacheEntry> | undefined;
  /* eslint-enable no-var */
}
interface VideoStore {
  videos: Video[] | null;
  loading: boolean;
  error: string | null;
  createVideo: (
    file: File,
    label: string,
    description: string,
  ) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  fetchVideos: () => Promise<void>;
  searchVideos: (
    query: string,
    opts?: {
      limit?: number;
      offset?: number;
      unlinkedOnly?: boolean;
      projectId?: string;
      signal?: AbortSignal;
    },
  ) => Promise<{ items: Video[]; total: number }>;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videos: null,
  loading: true,
  error: null,

  createVideo: async (file: File, label: string, description: string) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", label);
      formData.append("description", description);
      const res = await fetch("http://localhost:8000/api/v1/videos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newVideos = await res.json();
      set((state) => ({
        videos: state.videos ? [...state.videos, ...newVideos] : newVideos,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create video",
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchVideos: async () => {
    set({ loading: true });
    try {
      const res = await fetch("http://localhost:8000/api/v1/videos", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ videos: Array.isArray(data) ? data : [], error: null });
    } catch (error) {
      set({
        videos: null,
        error:
          error instanceof Error ? error.message : "Failed to fetch videos",
      });
    } finally {
      set({ loading: false });
    }
  },

  deleteVideo: async (videoId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/videos/${videoId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set((state) => ({
        videos: state.videos
          ? state.videos.filter((v) => v.id !== videoId)
          : null,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete video",
      });
    } finally {
      set({ loading: false });
    }
  },

  // client-side searchVideos: backend list endpoint lacks search params
  searchVideos: async (
    query: string,
    opts?: {
      limit?: number;
      offset?: number;
      unlinkedOnly?: boolean;
      projectId?: string;
      signal?: AbortSignal;
    },
  ) => {
    const q = (query || "").trim().toLowerCase();
    const limit = opts?.limit ?? 10;
    const offset = opts?.offset ?? 0;

    if (!globalThis.__videoSearchCache)
      globalThis.__videoSearchCache = new Map<string, VideoSearchCacheEntry>();
    const cache: Map<string, VideoSearchCacheEntry> =
      globalThis.__videoSearchCache!;
    const cacheKey = `videos:all`;
    const now = Date.now();

    try {
      let allVideos: Video[] | undefined = undefined;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > now) allVideos = cached.all;

      if (!allVideos) {
        const res = await fetch(`http://localhost:8000/api/v1/videos`, {
          credentials: "include",
          signal: opts?.signal,
        });
        if (!res.ok) {
          if (res.status === 403) return { items: [], total: 0 };
          throw new Error(`HTTP ${res.status}`);
        }
        allVideos = await res.json();
        cache.set(cacheKey, { expiresAt: now + 60_000, all: allVideos ?? [] });
      }

      const linkedIds = new Set<string>();
      if (opts?.unlinkedOnly && opts?.projectId) {
        try {
          const pvRes = await fetch(
            `http://localhost:8000/api/v1/projects/${opts.projectId}/videos`,
            {
              credentials: "include",
              signal: opts?.signal,
            },
          );
          if (pvRes.ok) {
            const linked = await pvRes.json();
            linked.forEach((projectVideo: ProjectVideo) => {
              const videoId = projectVideo.video?.id;
              if (videoId) linkedIds.add(videoId);
            });
          }
        } catch (err) {
          if ((err as Error)?.name === "AbortError") throw err;
          console.warn(
            "searchVideos: failed to fetch project linked videos",
            err,
          );
        }
      }

      const filtered = (allVideos || [])
        .filter((v) => !(opts?.unlinkedOnly && linkedIds.has(v.id)))
        .filter((v) => {
          if (!q) return true;
          const title = (v.label || "").toLowerCase();
          return (
            title.includes(q) ||
            v.description?.toLowerCase().includes(q) ||
            false
          );
        });

      const items = filtered.slice(offset, offset + limit);
      return { items, total: filtered.length };
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      console.error("searchVideos error", err);
      return { items: [], total: 0 };
    }
  },
}));
