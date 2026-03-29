import { getSiteUrl } from "@/lib/site-url";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { normalizeSupabaseError } from "@/lib/supabase-errors";
import type {
  PlatformCheckResult,
  PlatformServiceKey,
  ServiceHealthStatus,
} from "./types";
import { PLATFORM_SERVICE_KEYS } from "./types";

const FETCH_TIMEOUT_MS = 10_000;

async function withTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await factory(controller.signal);
  } finally {
    clearTimeout(id);
  }
}

function finish(
  key: PlatformServiceKey,
  status: ServiceHealthStatus,
  start: number,
  detail?: string
): PlatformCheckResult {
  return {
    key,
    status,
    latencyMs: Math.round(performance.now() - start),
    checkedAtIso: new Date().toISOString(),
    detail,
  };
}

/** App process is alive (served by this route). */
export async function checkWeb(): Promise<PlatformCheckResult> {
  const start = performance.now();
  return finish("web", "up", start);
}

/** Public API layer responds (routes + JSON). */
export async function checkApi(): Promise<PlatformCheckResult> {
  const start = performance.now();
  const base = getSiteUrl().replace(/\/$/, "");
  try {
    const res = await withTimeout(
      (signal) =>
        fetch(`${base}/api/health/web`, {
          signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      FETCH_TIMEOUT_MS
    );
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        key: "api",
        status: "down",
        latencyMs,
        checkedAtIso: new Date().toISOString(),
        detail: `HTTP ${res.status}`,
      };
    }
    return {
      key: "api",
      status: "up",
      latencyMs,
      checkedAtIso: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish("api", "down", start, msg);
  }
}

/** Supabase / PostgREST reachable with service role. */
export async function checkDatabase(): Promise<PlatformCheckResult> {
  const start = performance.now();
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("monitors").select("id").limit(1);
    if (error) {
      const e = normalizeSupabaseError(error);
      return finish(
        "database",
        "down",
        start,
        e.message ?? "Database query failed"
      );
    }
    return finish("database", "up", start);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish("database", "down", start, msg);
  }
}

/** Clerk Backend API responds (secret configured). */
export async function checkAuth(): Promise<PlatformCheckResult> {
  const start = performance.now();
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    return finish(
      "auth",
      "degraded",
      start,
      "CLERK_SECRET_KEY is not configured"
    );
  }
  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.clerk.com/v1/instance", {
          signal,
          headers: {
            Authorization: `Bearer ${secret}`,
            Accept: "application/json",
          },
        }),
      FETCH_TIMEOUT_MS
    );
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        key: "auth",
        status: res.status >= 500 ? "down" : "degraded",
        latencyMs,
        checkedAtIso: new Date().toISOString(),
        detail: `Clerk HTTP ${res.status}`,
      };
    }
    return {
      key: "auth",
      status: "up",
      latencyMs,
      checkedAtIso: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish("auth", "down", start, msg);
  }
}

/** Resend API key present and API reachable. */
export async function checkNotifications(): Promise<PlatformCheckResult> {
  const start = performance.now();
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return finish(
      "notifications",
      "degraded",
      start,
      "RESEND_API_KEY is not configured"
    );
  }
  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.resend.com/domains", {
          signal,
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
          },
        }),
      FETCH_TIMEOUT_MS
    );
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        key: "notifications",
        status: res.status >= 500 ? "down" : "degraded",
        latencyMs,
        checkedAtIso: new Date().toISOString(),
        detail: `Resend HTTP ${res.status}`,
      };
    }
    return {
      key: "notifications",
      status: "up",
      latencyMs,
      checkedAtIso: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish("notifications", "down", start, msg);
  }
}

export async function runAllPlatformChecks(): Promise<PlatformCheckResult[]> {
  const [web, api, database, auth, notifications] = await Promise.all([
    checkWeb(),
    checkApi(),
    checkDatabase(),
    checkAuth(),
    checkNotifications(),
  ]);
  return [web, api, database, auth, notifications];
}

export function checksByKey(
  results: PlatformCheckResult[]
): Map<PlatformServiceKey, PlatformCheckResult> {
  const m = new Map<PlatformServiceKey, PlatformCheckResult>();
  for (const r of results) {
    m.set(r.key, r);
  }
  for (const k of PLATFORM_SERVICE_KEYS) {
    if (!m.has(k)) {
      m.set(k, {
        key: k,
        status: "down",
        latencyMs: 0,
        checkedAtIso: new Date().toISOString(),
        detail: "Missing check result",
      });
    }
  }
  return m;
}
