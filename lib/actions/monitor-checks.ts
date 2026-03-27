"use server";

import { auth } from "@clerk/nextjs/server";
import { runChecksForMonitors } from "@/lib/monitoring/run-all-checks";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { aggregateChecksToHourlyBuckets } from "@/lib/dashboard-utils";
import {
  getMonitorChecksSince,
  getRecentMonitorChecks,
} from "@/lib/data/monitors";
import type { Monitor } from "@/lib/supabase";

/**
 * Probes every monitor belonging to the signed-in user and writes results to Supabase.
 * Use this from the dashboard; external schedulers call POST /api/check-monitors with header x-cron-secret.
 */
export async function runMyMonitorChecksNow() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    throw new Error("Failed to load monitors");
  }
  const monitors = (data ?? []) as Monitor[];
  if (monitors.length === 0) {
    return { checked: 0, results: [] as { id: string; result: string }[] };
  }
  return runChecksForMonitors(monitors);
}

/**
 * Run a single HTTP probe for one monitor (must belong to the signed-in user).
 */
export async function runSingleMonitorCheckNow(monitorId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const supabase = createAdminSupabaseClient();
  const { data: m, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("id", monitorId)
    .maybeSingle();
  if (error || !m || m.user_id !== userId) {
    throw new Error("Not found");
  }
  const row = m as Monitor;
  if (row.paused === true) {
    return {
      checked: 0,
      skipped: true as const,
      results: [] as { id: string; result: string }[],
    };
  }
  return runChecksForMonitors([row]);
}

/** Hourly aggregates + recent rows for the monitor detail side panel. */
export async function getMonitorPanelData(monitorId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const supabase = createAdminSupabaseClient();
  const { data: row, error } = await supabase
    .from("monitors")
    .select("user_id")
    .eq("id", monitorId)
    .maybeSingle();
  if (error || !row || row.user_id !== userId) {
    throw new Error("Not found");
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const checks24h = await getMonitorChecksSince(monitorId, since);
  const recentChecks = await getRecentMonitorChecks(monitorId, 30);
  const hourly = aggregateChecksToHourlyBuckets(checks24h, 24);
  return { hourly, recentChecks };
}
