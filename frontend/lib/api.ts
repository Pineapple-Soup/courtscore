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
  const res = await fetch(url, {
    ...rest,
    headers,
    body: resolvedBody,
    credentials: "include",
  });

  // ---- 401 handling ----
  if (res.status === 401 && !skipAuthRedirect) {
    handleUnauthorized();
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      (errorData as Record<string, string>)?.detail || "Unauthorized",
      401,
      errorData,
    );
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

  del<T = unknown>(endpoint: string, options?: ApiOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

export default api;
