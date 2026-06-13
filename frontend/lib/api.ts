import { useUserStore } from "@/store/useUserStore";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiOptions extends Omit<RequestInit, "body"> {
  /** Any serialisable value, FormData, or undefined. */
  body?: unknown;
  /** Query parameters to append to the URL. */
  params?: Record<string, string | number | boolean | undefined>;
  /** How to parse a successful response. Defaults to `"json"`. */
  responseType?: "json" | "blob" | "text" | "raw";
  /** Skip automatic redirect-to-login on 401. Use for login / signup calls. */
  skipAuthRedirect?: boolean;
}

// ---------------------------------------------------------------------------
// 401 deduplication guard
// ---------------------------------------------------------------------------

let isRedirecting = false;

function handleUnauthorized(): void {
  if (isRedirecting) return;
  isRedirecting = true;

  try {
    useUserStore.getState().clearUser();
  } catch {
    // Store may not be initialised yet – that's fine.
  }

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// ---------------------------------------------------------------------------
// Session refresh logic
// ---------------------------------------------------------------------------

/** How often (ms) the proactive refresh timer fires. Default: every 5 min. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Singleton that manages proactive session refresh.
 * Starts a background interval that calls POST /auth/refresh periodically,
 * keeping the JWT cookie alive as long as the browser tab is open.
 * Only runs on the client side.
 */
class SessionManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private started = false;

  /** Begin the proactive refresh cycle. Safe to call multiple times. */
  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    // Fire the first refresh after the interval, not immediately —
    // the user just authenticated so the token is fresh.
    this.intervalId = setInterval(() => {
      void this.refresh();
    }, REFRESH_INTERVAL_MS);

    // Also refresh when the tab regains visibility after being hidden
    // (e.g. user returns after a long break).
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  /** Stop the proactive refresh cycle. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.started = false;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      void this.refresh();
    }
  };

  /** Fire a single refresh request. Silently swallows errors. */
  private async refresh(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Network error – do nothing; the reactive 401 handler will
      // catch it on the next real API call.
    }
  }
}

export const sessionManager = new SessionManager();

// ---------------------------------------------------------------------------
// Reactive refresh: retry once on 401 before giving up
// ---------------------------------------------------------------------------

let isRefreshing: Promise<boolean> | null = null;

/**
 * Attempt a single token refresh. Returns true if the refresh succeeded.
 * Deduplicates concurrent callers so only one refresh request is in flight.
 */
async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing) return isRefreshing;

  isRefreshing = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = null;
    }
  })();

  return isRefreshing;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T = unknown>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    body,
    params,
    responseType = "json",
    skipAuthRedirect = false,
    headers: extraHeaders,
    signal,
    ...rest
  } = options;

  // ---- Build headers ----
  const headers = new Headers(extraHeaders as HeadersInit | undefined);

  let resolvedBody: BodyInit | undefined;

  if (body instanceof FormData) {
    // Let the browser set the multipart boundary automatically.
    resolvedBody = body;
  } else if (body !== undefined && body !== null) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    resolvedBody = JSON.stringify(body);
  }

  // ---- Append query parameters ----
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // ---- Fetch ----
  const fetchOptions: RequestInit = {
    ...rest,
    headers,
    body: resolvedBody,
    credentials: "include",
    signal,
  };

  let res = await fetch(url, fetchOptions);

  // ---- 401 handling with refresh retry ----
  if (res.status === 401 && !skipAuthRedirect) {
    // Try to refresh the token once before giving up
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry the original request with a fresh token
      res = await fetch(url, fetchOptions);
    }

    // If still 401 after refresh (or refresh failed), redirect to login
    if (res.status === 401) {
      handleUnauthorized();
      const errorData = await res.json().catch(() => ({}));
      throw new ApiError(
        (errorData as Record<string, string>)?.detail || "Unauthorized",
        401,
        errorData,
      );
    }
  }

  // ---- Error handling ----
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      (errorData as Record<string, string>)?.detail || `HTTP ${res.status}`,
      res.status,
      errorData,
    );
  }

  // ---- 204 No Content ----
  if (res.status === 204) {
    return null as T;
  }

  // ---- Parse response ----
  switch (responseType) {
    case "blob":
      return (await res.blob()) as T;
    case "text":
      return (await res.text()) as T;
    case "raw":
      return res as unknown as T;
    case "json":
    default:
      return (await res.json()) as T;
  }
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

const api = {
  get<T = unknown>(endpoint: string, options?: ApiOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },

  put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PUT", body });
  },

  patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  del<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiOptions,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE", body });
  },
};

export default api;
