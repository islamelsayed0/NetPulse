import { createIncident } from "@/lib/data/incidents";
import {
  refreshMonitorUptimePercentage,
  updateMonitorStatus,
} from "@/lib/data/monitors";
import { getUserSettingsForUser } from "@/lib/data/user-settings";
import {
  notifyMonitorDown,
  notifyMonitorRecovered,
} from "@/lib/notifications/monitor-notify";
import { assertPublicHttpUrl } from "@/lib/monitoring/url-guard";
import {
  createAdminSupabaseClient,
  type Monitor,
  type UserSettings,
} from "@/lib/supabase";

const CHECK_TIMEOUT_MS = 10_000;
const DEGRADED_RESPONSE_MS = 5_000;

export type MonitorCheckRunResult = { id: string; result: string };

export type ProbeResult = {
  checkStatus: "up" | "degraded" | "down";
  responseTime: number | null;
  statusCode: number | null;
  errorMessage: string | null;
};

function wasEffectivelyUp(status: string | null): boolean {
  return (
    status === "operational" ||
    status === "pending" ||
    status === "degraded"
  );
}

function formatOutageDuration(ms: number): string {
  const n = Math.max(0, ms);
  const sec = Math.floor(n / 1000);
  if (sec < 60) return `${sec} second${sec === 1 ? "" : "s"}`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"}`;
  const h = Math.floor(min / 60);
  const remMin = min % 60;
  if (h < 48) {
    return remMin > 0
      ? `${h} hour${h === 1 ? "" : "s"} ${remMin} min`
      : `${h} hour${h === 1 ? "" : "s"}`;
  }
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

const MAX_REDIRECT_HOPS = 5;

/**
 * GET probe with timeout. Up = 2xx within latency budget; degraded = 2xx but slow; down otherwise.
 *
 * Redirects are followed manually (max 5 hops) and every hop, including the
 * initial URL, is validated by assertPublicHttpUrl so a monitor can never be
 * used to reach private networks or cloud metadata endpoints (SSRF guard).
 */
export async function probeMonitorUrl(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const started = Date.now();
  try {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      try {
        await assertPublicHttpUrl(current);
      } catch (e) {
        const reason = e instanceof Error ? e.message : "URL is not allowed";
        return {
          checkStatus: "down",
          responseTime: Date.now() - started,
          statusCode: null,
          errorMessage: `Blocked target: ${reason}`,
        };
      }

      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "NetPulse-Monitor/1.0" },
      });
      const responseTime = Date.now() - started;
      const statusCode = res.status;

      if (statusCode >= 300 && statusCode < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return {
            checkStatus: "down",
            responseTime,
            statusCode,
            errorMessage: `HTTP ${statusCode} redirect without Location header`,
          };
        }
        if (hop === MAX_REDIRECT_HOPS) {
          return {
            checkStatus: "down",
            responseTime,
            statusCode,
            errorMessage: `Too many redirects (more than ${MAX_REDIRECT_HOPS})`,
          };
        }
        try {
          current = new URL(location, current).toString();
        } catch {
          return {
            checkStatus: "down",
            responseTime,
            statusCode,
            errorMessage: `HTTP ${statusCode} redirect to an invalid Location`,
          };
        }
        continue;
      }

      if (!res.ok) {
        return {
          checkStatus: "down",
          responseTime,
          statusCode,
          errorMessage: `HTTP ${statusCode}`,
        };
      }
      if (responseTime > DEGRADED_RESPONSE_MS) {
        return {
          checkStatus: "degraded",
          responseTime,
          statusCode,
          errorMessage: null,
        };
      }
      return {
        checkStatus: "up",
        responseTime,
        statusCode,
        errorMessage: null,
      };
    }
    return {
      checkStatus: "down",
      responseTime: Date.now() - started,
      statusCode: null,
      errorMessage: `Too many redirects (more than ${MAX_REDIRECT_HOPS})`,
    };
  } catch (e) {
    const responseTime = Date.now() - started;
    const message = e instanceof Error ? e.message : "Request failed";
    return {
      checkStatus: "down",
      responseTime,
      statusCode: null,
      errorMessage: message,
    };
  } finally {
    clearTimeout(t);
  }
}

async function loadUserSettingsForNotify(
  userId: string,
  cache: Map<string, UserSettings | null>
): Promise<UserSettings | null> {
  if (!cache.has(userId)) {
    try {
      cache.set(userId, await getUserSettingsForUser(userId));
    } catch (e) {
      console.error("loadUserSettingsForNotify", e);
      cache.set(userId, null);
    }
  }
  return cache.get(userId) ?? null;
}

async function persistOneCheck(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  m: Monitor,
  prevStatus: string | null,
  probe: ProbeResult,
  settingsCache: Map<string, UserSettings | null>,
  results: MonitorCheckRunResult[]
): Promise<void> {
  const checkStatus = probe.checkStatus;
  const checkedAt = new Date().toISOString();

  const { error: insErr } = await supabase.from("monitor_checks").insert({
    monitor_id: m.id,
    status: checkStatus,
    response_time: probe.responseTime,
    status_code: probe.statusCode,
    error_message: probe.errorMessage,
    checked_at: checkedAt,
  });
  if (insErr) {
    console.error(`[NetPulse] monitor_checks insert failed: ${m.name}`, insErr);
    results.push({ id: m.id, result: "check_insert_failed" });
    return;
  }

  try {
    await updateMonitorStatus(m.id, checkStatus);
    await refreshMonitorUptimePercentage(m.id);
  } catch (e) {
    console.error(`[NetPulse] monitor update failed: ${m.name}`, e);
    results.push({ id: m.id, result: "update_failed" });
    return;
  }

  const nowDown = checkStatus === "down";
  const wasDown = prevStatus === "down";

  if (nowDown && wasEffectivelyUp(prevStatus)) {
    const descParts = [
      `URL: ${m.url}`,
      probe.statusCode != null ? `HTTP status: ${probe.statusCode}` : null,
      probe.responseTime != null ? `Response time: ${probe.responseTime} ms` : null,
      probe.errorMessage ? `Error: ${probe.errorMessage}` : null,
    ].filter(Boolean);
    try {
      await createIncident({
        monitor_id: m.id,
        user_id: m.user_id,
        title: `Monitor Down — ${m.name}`,
        description: descParts.join("\n"),
        severity: "critical",
      });
      const settingsRow = await loadUserSettingsForNotify(
        m.user_id,
        settingsCache
      );
      await notifyMonitorDown(m, settingsRow, {
        statusCode: probe.statusCode,
        responseTime: probe.responseTime,
        errorMessage: probe.errorMessage,
        checkedAtIso: checkedAt,
      });
    } catch (e) {
      console.error(`[NetPulse] createIncident / notify down: ${m.name}`, e);
    }
  }

  const recoveredFromDown =
    wasDown && (checkStatus === "up" || checkStatus === "degraded");
  if (recoveredFromDown) {
    const { data: openRows, error: openErr } = await supabase
      .from("incidents")
      .select("started_at")
      .eq("monitor_id", m.id)
      .eq("status", "active")
      .order("started_at", { ascending: true });

    let downtime = "Unknown";
    if (!openErr && openRows?.length) {
      const first = openRows[0]?.started_at;
      if (first) {
        downtime = formatOutageDuration(
          Date.now() - new Date(first).getTime()
        );
      }
    } else if (openErr) {
      console.error(
        `[NetPulse] load active incidents for downtime: ${m.name}`,
        openErr
      );
    }

    const { error: resErr } = await supabase
      .from("incidents")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("monitor_id", m.id)
      .eq("status", "active");
    if (resErr) {
      console.error(`[NetPulse] resolve incident failed: ${m.name}`, resErr);
    } else {
      const settingsRow = await loadUserSettingsForNotify(
        m.user_id,
        settingsCache
      );
      await notifyMonitorRecovered(m, settingsRow, {
        checkedAtIso: checkedAt,
        downtime,
      });
    }
  }

  results.push({ id: m.id, result: checkStatus });
}

/**
 * Run HTTP probes and persist results for the given monitor rows (service role).
 */
export async function runChecksForMonitors(
  monitors: Monitor[]
): Promise<{ checked: number; results: MonitorCheckRunResult[] }> {
  const supabase = createAdminSupabaseClient();
  const results: MonitorCheckRunResult[] = [];
  const settingsCache = new Map<string, UserSettings | null>();

  const active = monitors.filter((m) => m.paused !== true);
  for (const m of monitors) {
    if (m.paused === true) {
      results.push({ id: m.id, result: "skipped_paused" });
    }
  }

  const settled = await Promise.allSettled(
    active.map((m) =>
      probeMonitorUrl(m.url).then((probe) => ({ m, probe }))
    )
  );

  for (const entry of settled) {
    if (entry.status === "rejected") {
      console.error("[NetPulse] probe Promise rejected (unexpected)", entry.reason);
      continue;
    }
    const { m, probe } = entry.value;
    const prevStatus = m.status;
    await persistOneCheck(
      supabase,
      m,
      prevStatus,
      probe,
      settingsCache,
      results
    );
  }

  const probed = active.length;
  return { checked: probed, results };
}

/** Load every non-paused monitor and run checks (for cron / POST /api/check-monitors). */
export async function runAllMonitorChecks(): Promise<{
  checked: number;
  results: MonitorCheckRunResult[];
}> {
  const supabase = createAdminSupabaseClient();
  const { data: monitors, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("paused", false);
  if (error) {
    console.error("runAllMonitorChecks list", error);
    throw new Error("Failed to load monitors");
  }
  return runChecksForMonitors((monitors ?? []) as Monitor[]);
}
