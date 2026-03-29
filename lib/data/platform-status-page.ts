import { createAdminSupabaseClient } from "@/lib/supabase";
import {
  formatSupabaseError,
  isPgrstSchemaMissingError,
  normalizeSupabaseError,
} from "@/lib/supabase-errors";
import { recordPlatformHealthDaily } from "@/lib/platform-health/record-snapshot";
import {
  checksByKey,
  runAllPlatformChecks,
} from "@/lib/platform-health/checks";
import type { HeatmapDayStatus } from "@/lib/platform-health/types";
import {
  PLATFORM_SERVICE_KEYS,
  type PlatformServiceKey,
} from "@/lib/platform-health/types";
import type { PlatformCheckResult } from "@/lib/platform-health/types";

export type OverallStatus = "operational" | "partial" | "major";

export type PlatformStatusService = {
  key: PlatformServiceKey;
  name: string;
  status: PlatformCheckResult["status"];
  badgeLabel: "Operational" | "Degraded" | "Down";
  latencyMs: number;
  checkedAtIso: string;
  uptimePct: number | null;
  heatmapDays: { date: string; status: HeatmapDayStatus }[];
  detail?: string;
};

export type PlatformStatusIncident = {
  id: string;
  title: string;
  severity: string;
  startedAtIso: string;
  resolvedAtIso: string;
  durationLabel: string;
};

export type PlatformStatusPageData = {
  generatedAtIso: string;
  overall: OverallStatus;
  services: PlatformStatusService[];
  incidents: PlatformStatusIncident[];
  loadError: string | null;
};

const SERVICE_META: Record<
  PlatformServiceKey,
  { name: string }
> = {
  web: { name: "Web Application" },
  api: { name: "API" },
  database: { name: "Database" },
  auth: { name: "Authentication" },
  notifications: { name: "Notifications" },
};

type RollupRow = {
  service_key: string;
  day_date: string;
  day_status: string;
};

function badgeFor(
  s: PlatformCheckResult["status"]
): "Operational" | "Degraded" | "Down" {
  if (s === "up") return "Operational";
  if (s === "down") return "Down";
  return "Degraded";
}

function computeOverall(
  statuses: PlatformCheckResult["status"][]
): OverallStatus {
  if (statuses.some((x) => x === "down")) return "major";
  if (statuses.some((x) => x === "degraded")) return "partial";
  return "operational";
}

function normalizeHeatmapStatus(raw: string): HeatmapDayStatus {
  if (raw === "up" || raw === "degraded" || raw === "down") return raw;
  return "none";
}

function utcTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildUtcHeatmapDays(
  rollupByDate: Map<string, HeatmapDayStatus>,
  liveStatus: HeatmapDayStatus
): { date: string; status: HeatmapDayStatus }[] {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const today = utcTodayString();
  const out: { date: string; status: HeatmapDayStatus }[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (89 - i));
    const key = d.toISOString().slice(0, 10);
    const status =
      key === today ? liveStatus : rollupByDate.get(key) ?? "none";
    out.push({ date: key, status });
  }
  return out;
}

function uptimeFromHeatmap(days: { status: HeatmapDayStatus }[]): number | null {
  let counted = 0;
  let up = 0;
  for (const d of days) {
    if (d.status === "none") continue;
    counted += 1;
    if (d.status === "up") up += 1;
  }
  if (counted === 0) return null;
  return Math.round((up / counted) * 10000) / 100;
}

function formatDuration(startedMs: number, resolvedMs: number): string {
  const ms = Math.max(0, resolvedMs - startedMs);
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return `${days}d ${h}h`;
}

function liveToHeatmapStatus(
  s: PlatformCheckResult["status"]
): HeatmapDayStatus {
  return s;
}

export async function loadPlatformStatusPageData(): Promise<PlatformStatusPageData> {
  const generatedAtIso = new Date().toISOString();
  let checkResults: PlatformCheckResult[] = [];
  try {
    checkResults = await runAllPlatformChecks();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("loadPlatformStatusPageData checks", msg);
    return {
      generatedAtIso,
      overall: "major",
      services: [],
      incidents: [],
      loadError: `Health checks failed: ${msg}`,
    };
  }

  await recordPlatformHealthDaily(checkResults);

  const byKey = checksByKey(checkResults);
  const rollupMap = new Map<PlatformServiceKey, Map<string, HeatmapDayStatus>>();

  const supabase = createAdminSupabaseClient();
  const { data: rollupData, error: rollupErr } = await supabase.rpc(
    "get_platform_status_heatmap_rollups"
  );
  if (rollupErr) {
    const e = normalizeSupabaseError(rollupErr);
    const optional =
      e.code === "PGRST202" ||
      e.code === "PGRST205" ||
      e.message?.includes("does not exist");
    if (!optional) {
      console.error(
        "get_platform_status_heatmap_rollups",
        formatSupabaseError(e) || e.message || rollupErr
      );
    }
  } else {
    const keys = new Set<string>(PLATFORM_SERVICE_KEYS);
    for (const row of (rollupData ?? []) as RollupRow[]) {
      const k = row.service_key;
      if (!keys.has(k)) continue;
      const sk = k as PlatformServiceKey;
      if (!rollupMap.has(sk)) rollupMap.set(sk, new Map());
      rollupMap
        .get(sk)!
        .set(row.day_date, normalizeHeatmapStatus(row.day_status));
    }
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  ninetyDaysAgo.setUTCHours(0, 0, 0, 0);

  const { data: incidentRows, error: incErr } = await supabase
    .from("platform_incidents")
    .select("id, title, severity, started_at, resolved_at")
    .not("resolved_at", "is", null)
    .gte("resolved_at", ninetyDaysAgo.toISOString())
    .order("resolved_at", { ascending: false });

  const incidents: PlatformStatusIncident[] = [];
  if (incErr) {
    const e = normalizeSupabaseError(incErr);
    if (!isPgrstSchemaMissingError(e)) {
      console.error(
        "platform_incidents",
        formatSupabaseError(e) || e.message || incErr
      );
    }
  } else {
    for (const row of incidentRows ?? []) {
      const r = row as {
        id: string;
        title: string;
        severity: string;
        started_at: string | null;
        resolved_at: string | null;
      };
      if (!r.resolved_at) continue;
      const started = r.started_at
        ? new Date(r.started_at).getTime()
        : new Date(r.resolved_at).getTime();
      const resolved = new Date(r.resolved_at).getTime();
      incidents.push({
        id: r.id,
        title: r.title,
        severity: r.severity,
        startedAtIso: r.started_at ?? r.resolved_at,
        resolvedAtIso: r.resolved_at,
        durationLabel: formatDuration(started, resolved),
      });
    }
  }

  const services: PlatformStatusService[] = PLATFORM_SERVICE_KEYS.map((key) => {
    const r = byKey.get(key)!;
    const perDay = rollupMap.get(key) ?? new Map<string, HeatmapDayStatus>();
    const liveH = liveToHeatmapStatus(r.status);
    const heatmapDays = buildUtcHeatmapDays(perDay, liveH);
    return {
      key,
      name: SERVICE_META[key].name,
      status: r.status,
      badgeLabel: badgeFor(r.status),
      latencyMs: r.latencyMs,
      checkedAtIso: r.checkedAtIso,
      uptimePct: uptimeFromHeatmap(heatmapDays),
      heatmapDays,
      detail: r.detail,
    };
  });

  const overall = computeOverall(checkResults.map((c) => c.status));

  return {
    generatedAtIso,
    overall,
    services,
    incidents,
    loadError: null,
  };
}
