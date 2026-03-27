import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Row shape for `monitors` */
export type Monitor = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  type: string;
  interval: number;
  status: string | null;
  uptime_percentage: number | null;
  last_checked: string | null;
  created_at: string | null;
  notification_email?: string | null;
  paused?: boolean | null;
};

/** Row shape for `monitor_checks` */
export type MonitorCheck = {
  id: string;
  monitor_id: string;
  status: string;
  response_time: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string | null;
};

/** Row shape for `incidents` */
export type Incident = {
  id: string;
  monitor_id: string;
  user_id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string | null;
  started_at: string | null;
  resolved_at: string | null;
};

/** Row shape for `incident_updates` */
export type IncidentUpdate = {
  id: string;
  incident_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
};

/** Row shape for `user_settings` */
export type UserSettings = {
  id: string;
  user_id: string;
  notification_email: string | null;
  email_on_down: boolean;
  email_on_recovery: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  response_time_threshold: number;
  downtime_delay: number;
  alert_cooldown: number;
  discord_webhook: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function requireEnv(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

/**
 * Public (anon) Supabase client. After `002_rls_anon_policies.sql`, RLS allows `anon` full
 * access to NetPulse tables (see migration WARNING). Prefer server-side
 * `createAdminSupabaseClient` for real app data; for strict multi-tenant DB security use
 * Clerk JWT with Supabase third-party auth and row policies on `user_id`.
 */
export function createPublicSupabaseClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return createClient(url, anonKey);
}

/**
 * Browser Supabase client (alias). Prefer `createPublicSupabaseClient`.
 */
export function createBrowserClient(): SupabaseClient {
  return createPublicSupabaseClient();
}

/**
 * Service-role admin client for server-only use. Bypasses RLS; always filter by Clerk `user_id` yourself.
 * Accepts `SUPABASE_SERVICE_ROLE_KEY` (legacy JWT) or `SUPABASE_SECRET_KEY` (new sb_secret_ key).
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY (server only)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
