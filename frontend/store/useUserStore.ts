import { create } from "zustand";
import { ProjectMember } from "@/types/project";
import { User } from "@/types/user";

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
      const res = await fetch("http://localhost:8000/api/v1/users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ users: data });
    } catch (err) {
      console.error("fetchUsers error", err);
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  fetchCurrentUser: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8000/auth/me", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
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
        const res = await fetch(`http://localhost:8000/api/v1/users`, {
          credentials: "include",
          signal: opts?.signal,
        });
        if (!res.ok) {
          if (res.status === 403) return { items: [], total: 0 };
          throw new Error(`HTTP ${res.status}`);
        }
        allUsers = await res.json();
        cache.set(cacheKey, { expiresAt: now + 60_000, all: allUsers ?? [] });
      }

      // exclude project members if requested
      const excludeIds = new Set<string>();
      if (opts?.excludeProjectId) {
        try {
          const mres = await fetch(
            `http://localhost:8000/api/v1/projects/${opts.excludeProjectId}/members`,
            {
              credentials: "include",
              signal: opts?.signal,
            },
          );
          if (mres.ok) {
            const projectMembers: ProjectMember[] = await mres.json();
            const users = projectMembers.map((m) => m.user);
            users.map((u) => excludeIds.add(u.id));
          }
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

export default useUserStore;
