import { createAdminSupabaseClient } from "@/lib/supabase";
import { normalizeSupabaseError } from "@/lib/supabase-errors";
import type { PlatformCheckResult } from "./types";

function utcTodayString(): string {
  const n = new Date();
  return n.toISOString().slice(0, 10);
}

/**
 * Persists today's per-service status for the public 90-day heatmap.
 * Safe to call on every ISR tick; failures are logged only (e.g. migration not applied).
 */
export async function recordPlatformHealthDaily(
  results: PlatformCheckResult[]
): Promise<void> {
  const dayUtc = utcTodayString();
  const supabase = createAdminSupabaseClient();
  const rows = results.map((r) => ({
    service_key: r.key,
    day_utc: dayUtc,
    status: r.status,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("platform_health_daily").upsert(rows, {
    onConflict: "service_key,day_utc",
  });
  if (error) {
    const e = normalizeSupabaseError(error);
    if (e.code !== "PGRST205" && e.code !== "42P01") {
      console.error(
        "recordPlatformHealthDaily",
        e.message ?? error.message ?? error
      );
    }
  }
}
