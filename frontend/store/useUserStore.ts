import { create } from "zustand";
import { ProjectMember } from "@/types/project";
import { User } from "@/types/user";
import api from "@/lib/api";

declare global {
  interface UserSearchCacheEntry {
    expiresAt: number;
    all: User[];
  }
  /* eslint-disable no-var */
  var __userSearchCache: Map<string, UserSearchCacheEntry> | undefined;
  /* eslint-enable no-var */
}

type SearchResult<T> = { items: T[]; total: number };

export enum Tabs {
  VIDEOS = "VIDEOS",
  PROJECTS = "PROJECTS",
  USERS = "USERS",
}

interface UserState {
  users: User[] | null;
  currentUser: User | null;
  token?: string | null;
  loading: boolean;
  error?: string | null;
  isAdmin: boolean;
  activeTab: Tabs;
  searchUsers: (
    query: string,
    opts?: {
      limit?: number;
      offset?: number;
      excludeProjectId?: string;
      excludeAdmin?: boolean;
      signal?: AbortSignal;
    },
  ) => Promise<SearchResult<User>>;
  fetchUsers: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  setUser: (u: User | null) => void;
  setActiveTab: (tab: Tabs) => void;
  clearUser: () => void;
  promoteUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: null,
  currentUser: null,
  isAdmin: false,
  loading: true,
  error: null,
  activeTab: Tabs.VIDEOS,

  fetchUsers: async () => {
    try {
      const data = await api.get<User[]>(`/api/v1/users`);
      set({ users: data });
    } catch (err) {
      console.error("fetchUsers error", err);
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  fetchCurrentUser: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<User>(`/auth/me`);
      set({ currentUser: data, isAdmin: data?.role === "admin" });
    } catch (err) {
      set({
        currentUser: null,
        error: err instanceof Error ? err.message : String(err),
        isAdmin: false,
      });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  setUser: (user: User | null) =>
    set({ currentUser: user, isAdmin: user?.role === "admin" }),

  clearUser: () =>
    set({
      currentUser: null,
      token: null,
      isAdmin: false,
      activeTab: Tabs.VIDEOS,
    }),

  setActiveTab: (tab: Tabs) => set({ activeTab: tab }),

  promoteUser: async (userId: string) => {
    try {
      const updatedUser = await api.get<User>(
        `/api/v1/users/promote?user_id=${userId}`,
      );
      set((state) => ({
        users: state.users
          ? state.users.map((u) =>
              u.id === updatedUser.id ? { ...u, ...updatedUser } : u,
            )
          : null,
      }));
    } catch (err) {
      console.error("promoteUser error", err);
      throw err;
    }
  },

  deleteUser: async (userId: string) => {
    try {
      await api.del(`/api/v1/users/${userId}`);
      set((state) => ({
        users: state.users ? state.users.filter((u) => u.id !== userId) : null,
      }));
    } catch (err) {
      console.error("deleteUser error", err);
      throw err;
    }
  },

  // Client-side searchUsers: backend list endpoints don't accept search params,
  // so fetch the full list (cached) and filter locally. Accepts an AbortSignal
  // so callers can cancel in-flight requests.
  searchUsers: async (
    query: string,
    opts?: {
      limit?: number;
      offset?: number;
      excludeProjectId?: string;
      excludeAdmin?: boolean;
      signal?: AbortSignal;
    },
  ) => {
    const q = (query || "").trim().toLowerCase();
    const limit = opts?.limit ?? 10;
    const offset = opts?.offset ?? 0;

    type CacheEntry = { expiresAt: number; all: User[] };
    // attach cache to globalThis to survive HMR
    if (!globalThis.__userSearchCache)
      globalThis.__userSearchCache = new Map<string, CacheEntry>();
    const cache: Map<string, CacheEntry> = globalThis.__userSearchCache;
    const cacheKey = `users:all`;
    const now = Date.now();

    try {
      let allUsers: User[] | undefined = undefined;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        allUsers = cached.all;
      }

      if (!allUsers) {
        allUsers = await api.get<User[]>(`/api/v1/users`, {
          signal: opts?.signal,
        });
        cache.set(cacheKey, { expiresAt: now + 60_000, all: allUsers ?? [] });
      }

      // exclude project members if requested
      const excludeIds = new Set<string>();
      if (opts?.excludeProjectId) {
        try {
          const projectMembers = await api.get<ProjectMember[]>(
            `/api/v1/projects/${opts.excludeProjectId}/members`,
            { signal: opts?.signal },
          );
          projectMembers.forEach((m) => excludeIds.add(m.user.id));
        } catch (err) {
          if ((err as Error)?.name === "AbortError") throw err;
          // ignore member fetch failures and continue with full list
          console.warn("searchUsers: failed to fetch project members", err);
        }
      }

      // exclude admins if requested
      if (opts?.excludeAdmin) {
        allUsers = allUsers?.filter((u) => u.role !== "admin");
      }

      const filtered = (allUsers || [])
        .filter((u) => !excludeIds.has(u.id))
        .filter((u) => {
          if (!q) return true;
          const name = (u.name || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        });

      const items = filtered.slice(offset, offset + limit);
      return { items, total: filtered.length };
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      console.error("searchUsers error", err);
      return { items: [], total: 0 };
    }
  },
}));
