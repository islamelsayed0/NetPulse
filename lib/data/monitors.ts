import {
  createAdminSupabaseClient,
  type Monitor,
  type MonitorCheck,
} from "@/lib/supabase";
import type { MonitorListItem, MonitorRow } from "@/lib/dashboard-types";
import { INPUT_LIMITS } from "@/lib/constants";
import {
  sanitizeMonitorName,
  sanitizeMonitorUrlForStorage,
  sanitizePlainText,
} from "@/lib/sanitize";
import {
  formatSupabaseError,
  isPgrstSchemaMissingError,
  missingTablesHint,
  normalizeSupabaseError,
} from "@/lib/supabase-errors";

export type CreateMonitorInput = {
  name: string;
  url: string;
  type: string;
  interval: number;
  notification_email?: string | null;
};

export type UptimeDayPoint = { day: string; uptimePct: number };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeMonitorUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function dbStatusToHealth(
  status: string | null
): "operational" | "down" | "degraded" {
  if (status === "operational") return "operational";
  if (status === "down") return "down";
  return "degraded";
}

export function monitorRowToViewModel(m: Monitor): MonitorRow {
  return {
    id: m.id,
    name: m.name,
    url: m.url,
    status: dbStatusToHealth(m.status),
    uptimePct: Number(m.uptime_percentage ?? 100),
    lastChecked: m.last_checked ? new Date(m.last_checked) : null,
  };
}


export function monitorToListItem(
  m: Monitor,
  latestById: Map<
    string,
    { responseTime: number | null; checkedAt: string | null }
  >
): MonitorListItem {
  const base = monitorRowToViewModel(m);
  const latest = latestById.get(m.id);
  return {
    ...base,
    monitorType: m.type || "http",
    intervalMinutes: m.interval,
    createdAt: m.created_at ? new Date(m.created_at) : null,
    lastResponseMs: latest?.responseTime ?? null,
    paused: Boolean(m.paused),
    notificationEmail: m.notification_email ?? null,
  };
}

export async function getMonitorsForUser(userId: string): Promise<Monitor[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    if (!isPgrstSchemaMissingError(e)) {
      console.error("getMonitorsForUser", shown);
    }
    throw new Error(
      `Failed to load monitors: ${shown}${missingTablesHint(e)}`
    );
  }
  return (data ?? []) as Monitor[];
}

export async function insertMonitor(
  userId: string,
  data: CreateMonitorInput
): Promise<Monitor> {
  const supabase = createAdminSupabaseClient();
  const name = sanitizeMonitorName(data.name);
  const url = normalizeMonitorUrl(sanitizeMonitorUrlForStorage(data.url));
  if (!name || !url) {
    throw new Error("Name and URL are required");
  }
  const insertRow: Record<string, unknown> = {
    user_id: userId,
    name,
    url,
    type: data.type || "http",
    interval: data.interval,
    status: "pending",
    uptime_percentage: 100,
  };
  const neRaw = data.notification_email?.trim();
  const ne = neRaw
    ? sanitizePlainText(neRaw, INPUT_LIMITS.notificationEmail)
    : "";
  if (ne) {
    insertRow.notification_email = ne;
  }

  let { data: row, error } = await supabase
    .from("monitors")
    .insert(insertRow)
    .select()
    .single();

  const insertErr = error ? normalizeSupabaseError(error) : null;
  if (
    error &&
    insertErr?.code === "PGRST204" &&
    insertErr.message?.includes("notification_email") &&
    ne
  ) {
    const { notification_email: _, ...rest } = insertRow;
    const r2 = await supabase.from("monitors").insert(rest).select().single();
    if (!r2.error && r2.data) {
      console.error(
        "[NetPulse] insertMonitor: created without notification_email — run supabase/migrations/003_monitor_notification_pause.sql"
      );
      return r2.data as Monitor;
    }
    error = r2.error;
    row = r2.data;
  }

  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    if (!isPgrstSchemaMissingError(e)) {
      console.error("insertMonitor", shown);
    }
    throw new Error(
      `Failed to create monitor: ${shown}${missingTablesHint(e)}`
    );
  }
  return row as Monitor;
}

export async function deleteMonitorForUser(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("monitors")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing || existing.user_id !== userId) {
    throw new Error("Not found");
  }
  const { error } = await supabase.from("monitors").delete().eq("id", id);
  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    console.error("deleteMonitorForUser", shown);
    throw new Error(
      `Failed to delete monitor: ${shown}${missingTablesHint(e)}`
    );
  }
}

export async function updateMonitorStatus(
  id: string,
  status: string,
  _responseTime: number | null,
  _statusCode: number | null
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const monitorStatus =
    status === "up" ? "operational" : status === "down" ? "down" : "degraded";
  const { error } = await supabase
    .from("monitors")
    .update({
      status: monitorStatus,
      last_checked: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    console.error("updateMonitorStatus", shown);
    throw new Error(
      `Failed to update monitor status: ${shown}${missingTablesHint(e)}`
    );
  }
}

const UPTIME_ROLLING_CHECK_LIMIT = 720;

function checkCountsTowardUptime(status: string): boolean {
  return status === "up" || status === "degraded";
}

export async function refreshMonitorUptimePercentage(
  monitorId: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: recent, error: fetchErr } = await supabase
    .from("monitor_checks")
    .select("status")
    .eq("monitor_id", monitorId)
    .order("checked_at", { ascending: false })
    .limit(UPTIME_ROLLING_CHECK_LIMIT);
  if (fetchErr) {
    const fe = normalizeSupabaseError(fetchErr);
    console.error(
      "refreshMonitorUptimePercentage",
      formatSupabaseError(fe) || fe.message || fetchErr
    );
    return;
  }
  const total = recent?.length ?? 0;
  const up =
    recent?.filter((c) => checkCountsTowardUptime(c.status as string))
      .length ?? 0;
  const pct = total === 0 ? 100 : Math.round((up / total) * 10000) / 100;
  const { error } = await supabase
    .from("monitors")
    .update({ uptime_percentage: pct })
    .eq("id", monitorId);
  if (error) {
    const e = normalizeSupabaseError(error);
    console.error(
      "refreshMonitorUptimePercentage update",
      formatSupabaseError(e) || e.message || error
    );
  }
}

export async function getUptimeSeriesForUser(
  userId: string
): Promise<UptimeDayPoint[]> {
  const supabase = createAdminSupabaseClient();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);

  const { data: userMonitors, error: monErr } = await supabase
    .from("monitors")
    .select("id")
    .eq("user_id", userId);
  if (monErr || !userMonitors?.length) {
    if (monErr) {
      const e = normalizeSupabaseError(monErr);
      const detail = formatSupabaseError(e);
      if (!isPgrstSchemaMissingError(e)) {
        console.error(
          "getUptimeSeriesForUser monitors",
          detail || e.message || monErr
        );
      }
    }
    return buildEmptyWeekSeries();
  }
  const ids = userMonitors.map((m) => m.id);
  const { data: checks, error } = await supabase
    .from("monitor_checks")
    .select("checked_at, status")
    .in("monitor_id", ids)
    .gte("checked_at", start.toISOString());

  if (error) {
    const e = normalizeSupabaseError(error);
    if (!isPgrstSchemaMissingError(e)) {
      console.error(
        "getUptimeSeriesForUser checks",
        formatSupabaseError(e) || e.message || error
      );
    }
    return buildEmptyWeekSeries();
  }

  const byDay = new Map<string, { up: number; total: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { up: 0, total: 0 });
  }

  for (const row of checks ?? []) {
    const at = row.checked_at
      ? new Date(row.checked_at).toISOString().slice(0, 10)
      : null;
    if (!at || !byDay.has(at)) continue;
    const bucket = byDay.get(at)!;
    bucket.total += 1;
    if (row.status === "up" || row.status === "degraded") bucket.up += 1;
  }

  const points: UptimeDayPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const { up, total } = byDay.get(key)!;
    const pct = total === 0 ? 100 : Math.round((up / total) * 10000) / 100;
    points.push({
      day: DAY_LABELS[d.getUTCDay()],
      uptimePct: pct,
    });
  }
  return points;
}

function buildEmptyWeekSeries(): UptimeDayPoint[] {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);
  const out: UptimeDayPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push({ day: DAY_LABELS[d.getUTCDay()], uptimePct: 100 });
  }
  return out;
}

/** Neutral 7-day series when the DB is unavailable or has no checks yet. */
export function getEmptyUptimeWeekSeries(): UptimeDayPoint[] {
  return buildEmptyWeekSeries();
}

export type UpdateMonitorInput = {
  name?: string;
  url?: string;
  type?: string;
  interval?: number;
  notification_email?: string | null;
};

export async function getLatestCheckByMonitorIds(
  monitorIds: string[]
): Promise<
  Map<string, { responseTime: number | null; checkedAt: string | null }>
> {
  const map = new Map<
    string,
    { responseTime: number | null; checkedAt: string | null }
  >();
  if (monitorIds.length === 0) return map;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("monitor_checks")
    .select("monitor_id, response_time, checked_at")
    .in("monitor_id", monitorIds)
    .order("checked_at", { ascending: false })
    .limit(8000);
  if (error || !data) return map;
  for (const row of data) {
    const id = row.monitor_id as string;
    if (!map.has(id)) {
      map.set(id, {
        responseTime: row.response_time as number | null,
        checkedAt: row.checked_at as string | null,
      });
    }
  }
  return map;
}

export type UpdateMonitorResult = { warning?: string };

export async function updateMonitorForUser(
  userId: string,
  monitorId: string,
  patch: UpdateMonitorInput
): Promise<UpdateMonitorResult> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("monitors")
    .select("user_id")
    .eq("id", monitorId)
    .maybeSingle();
  if (fetchErr || !existing || existing.user_id !== userId) {
    throw new Error("Not found");
  }
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = sanitizeMonitorName(patch.name);
  if (patch.url !== undefined) {
    const u = normalizeMonitorUrl(sanitizeMonitorUrlForStorage(patch.url));
    if (!u) throw new Error("URL is required");
    updates.url = u;
  }
  if (patch.type !== undefined) updates.type = patch.type;
  if (patch.interval !== undefined) updates.interval = patch.interval;
  if (patch.notification_email !== undefined) {
    const raw = patch.notification_email?.trim();
    updates.notification_email = raw
      ? sanitizePlainText(raw, INPUT_LIMITS.notificationEmail)
      : null;
  }
  if (Object.keys(updates).length === 0) return {};

  const emailFieldTouched = patch.notification_email !== undefined;

  let { error } = await supabase
    .from("monitors")
    .update(updates)
    .eq("id", monitorId);

  const firstErr = error ? normalizeSupabaseError(error) : null;
  if (
    error &&
    firstErr?.code === "PGRST204" &&
    firstErr.message?.includes("notification_email") &&
    "notification_email" in updates
  ) {
    const { notification_email: _, ...rest } = updates;
    if (Object.keys(rest).length > 0) {
      const { error: err2 } = await supabase
        .from("monitors")
        .update(rest)
        .eq("id", monitorId);
      if (!err2) {
        if (emailFieldTouched) {
          return {
            warning:
              "Per-monitor email was not saved (add column via supabase/migrations/003_monitor_notification_pause.sql in Supabase). Other changes were saved. Alert email still uses Settings → Integrations.",
          };
        }
        return {};
      }
      error = err2;
    } else {
      return {
        warning: `Per-monitor notification email needs migration 003_monitor_notification_pause.sql in the Supabase SQL Editor.${missingTablesHint(firstErr)} Alert email uses Settings → Integrations.`,
      };
    }
  }

  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to update monitor: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }

  return {};
}

export async function setMonitorPausedForUser(
  userId: string,
  monitorId: string,
  paused: boolean
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("monitors")
    .select("user_id")
    .eq("id", monitorId)
    .maybeSingle();
  if (fetchErr || !existing || existing.user_id !== userId) {
    throw new Error("Not found");
  }
  const { error } = await supabase
    .from("monitors")
    .update({ paused })
    .eq("id", monitorId);
  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to update monitor: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
}

export async function getMonitorChecksSince(
  monitorId: string,
  sinceIso: string
): Promise<MonitorCheck[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("monitor_checks")
    .select("*")
    .eq("monitor_id", monitorId)
    .gte("checked_at", sinceIso)
    .order("checked_at", { ascending: true });
  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to load checks: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
  return (data ?? []) as MonitorCheck[];
}

export async function getRecentMonitorChecks(
  monitorId: string,
  limit: number
): Promise<MonitorCheck[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("monitor_checks")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to load checks: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
  return (data ?? []) as MonitorCheck[];
}
