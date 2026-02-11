import { create } from "zustand";
import { User } from "@/types/user";

interface UserState {
  user: User | null;
  token?: string | null;
  loading: boolean;
  error?: string | null;
  isAdmin: boolean;
  fetchCurrentUser: () => Promise<void>;
  setUser: (u: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,
  error: null,
  isAdmin: false,

  fetchCurrentUser: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8000/auth/me", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ user: data, isAdmin: data?.role === "admin" });
    } catch (err) {
      set({
        user: null,
        error: err instanceof Error ? err.message : String(err),
        isAdmin: false,
      });
    } finally {
      set({ loading: false });
    }
  },

  setUser: (user: User | null) =>
    set({ user: user, isAdmin: user?.role === "admin" }),

  clearUser: () => set({ user: null, token: null, isAdmin: false }),
}));

export default useUserStore;
