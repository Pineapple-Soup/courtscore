import { create } from "zustand";
import { Video } from "@/types/video";

interface VideoStore {
  videos: Video[] | null;
  loading: boolean;
  error: string | null;
  fetchVideos: () => Promise<void>;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videos: null,
  loading: true,
  error: null,

  fetchVideos: async () => {
    set({ loading: true });
    try {
      const res = await fetch("http://localhost:8000/api/v1/videos");
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
}));
