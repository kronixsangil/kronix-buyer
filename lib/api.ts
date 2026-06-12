// lib/api.ts
"use client";

export type ApiFetchOptions = RequestInit & {
  json?: any;
  suppressSessionExpiredEvent?: boolean;
  suppressActivityRefresh?: boolean;
  _retriedAfterRefresh?: boolean;
};

export type ApiError = Error & {
  status?: number;
  raw?: string;
};

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/buyer";
  }

  return process.env.NEXT_PUBLIC_API || "http://localhost:3004";
}

const CT_APP = "buyer";
let lastActivityRefreshAt = 0;
let activityRefreshPromise: Promise<void> | null = null;

function joinUrl(base: string, path: string) {
  if (path.startsWith("http")) return path;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function makeApiError(message: string, status?: number, raw?: string): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.raw = raw;
  return err;
}

function shouldRefreshActivity(path: string, opts: ApiFetchOptions) {
  if (opts.suppressActivityRefresh) return false;
  if (typeof window === "undefined") return false;

  const p = String(path || "");
  if (p.includes("/auth/login")) return false;
  if (p.includes("/auth/register")) return false;
  if (p.includes("/auth/logout")) return false;
  if (p.includes("/auth/refresh")) return false;

  return true;
}

function canRetryAfterRefresh(path: string, opts: ApiFetchOptions) {
  if (opts._retriedAfterRefresh) return false;
  if (opts.suppressSessionExpiredEvent) return false;
  if (typeof window === "undefined") return false;

  const p = String(path || "");
  if (p.includes("/auth/login")) return false;
  if (p.includes("/auth/register")) return false;
  if (p.includes("/auth/logout")) return false;
  if (p.includes("/auth/refresh")) return false;

  return true;
}

async function tryRefreshAccessToken() {
  const base = getApiBase();
  const refreshUrl = joinUrl(base, "/auth/refresh");

  const res = await fetch(refreshUrl, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "x-ct-app": CT_APP,
    },
  });

  if (!res.ok) return false;

  lastActivityRefreshAt = Date.now();
  return true;
}

async function refreshActivityIfNeeded(path: string, opts: ApiFetchOptions) {
  if (!shouldRefreshActivity(path, opts)) return;

  const now = Date.now();

  // Renovamos máximo una vez por minuto mientras el usuario esté activo.
  if (now - lastActivityRefreshAt < 60_000) return;

  if (activityRefreshPromise) {
    await activityRefreshPromise.catch(() => {});
    return;
  }

  const base = getApiBase();
  const refreshUrl = joinUrl(base, "/auth/refresh");

  activityRefreshPromise = fetch(refreshUrl, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "x-ct-app": CT_APP,
    },
  })
    .then(async (res) => {
      if (res.ok) {
        lastActivityRefreshAt = Date.now();
        return;
      }

      if (res.status === 401 || res.status === 403) {
        const { emitSessionExpiredOnce } = await import("./sessionExpired");
        emitSessionExpiredOnce();
      }
    })
    .catch(() => {})
    .finally(() => {
      activityRefreshPromise = null;
    });

  await activityRefreshPromise;
}

export async function apiFetch<T = any>(
  path: string,
  opts: ApiFetchOptions = {}
): Promise<T> {
  const base = getApiBase();
  const url = joinUrl(base, path);

  const headers: Record<string, string> = {
    ...(opts.headers as any),
    "x-ct-app": CT_APP,
  };

  let body = opts.body;

  if (opts.json !== undefined) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(url, {
    ...opts,
    headers,
    body,
    credentials: "include",
    cache: opts.cache ?? "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");

    if ((res.status === 401 || res.status === 403) && canRetryAfterRefresh(path, opts)) {
      const refreshed = await tryRefreshAccessToken().catch(() => false);

      if (refreshed) {
        return apiFetch<T>(path, {
          ...opts,
          _retriedAfterRefresh: true,
        });
      }
    }

    if (!opts.suppressSessionExpiredEvent && (res.status === 401 || res.status === 403)) {
      try {
        const { emitSessionExpiredOnce } = await import("./sessionExpired");
        emitSessionExpiredOnce();
      } catch {}
    }

    throw makeApiError(txt || `HTTP ${res.status}`, res.status, txt);
  }

  await refreshActivityIfNeeded(path, opts);

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    return txt as unknown as T;
  }

  return (await res.json()) as T;
}

