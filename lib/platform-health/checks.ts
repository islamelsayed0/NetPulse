import type {
  PlatformCheckResult,
  PlatformServiceKey,
  ServiceHealthStatus,
} from "./types";
import { PLATFORM_SERVICE_KEYS } from "./types";
import {
  integrationEnvDetail,
  missingIntegrationEnvVars,
} from "./integration-env";

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

/**
 * HTTP API surface: no outbound fetch (avoids loops and middleware edge cases).
 * Treat as up when this process is serving routes.
 */
export async function checkApi(): Promise<PlatformCheckResult> {
  const start = performance.now();
  return finish("api", "up", start);
}

/** Database config present (no live PostgREST call). */
export async function checkDatabase(): Promise<PlatformCheckResult> {
  const start = performance.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url) {
    return finish(
      "database",
      "degraded",
      start,
      "NEXT_PUBLIC_SUPABASE_URL is not configured"
    );
  }
  if (!serviceKey) {
    return finish(
      "database",
      "degraded",
      start,
      "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is not configured"
    );
  }
  return finish("database", "up", start);
}

/** Clerk config present (no Clerk REST API — avoids 401 from restricted keys). */
export async function checkAuth(): Promise<PlatformCheckResult> {
  const start = performance.now();
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!publishable) {
    return finish(
      "auth",
      "degraded",
      start,
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured"
    );
  }
  if (!secret) {
    return finish(
      "auth",
      "degraded",
      start,
      "CLERK_SECRET_KEY is not configured"
    );
  }
  return finish("auth", "up", start);
}

/**
 * Integration env: Resend + Supabase URL + Clerk publishable (no external HTTP).
 */
export async function checkNotifications(): Promise<PlatformCheckResult> {
  const start = performance.now();
  const missing = missingIntegrationEnvVars();
  if (missing.length > 0) {
    return finish(
      "notifications",
      "degraded",
      start,
      integrationEnvDetail(missing)
    );
  }
  return finish("notifications", "up", start);
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
