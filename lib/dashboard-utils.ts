import type { MonitorRow } from "@/lib/dashboard-types";

export function computeStats(monitors: MonitorRow[]) {
  const total = monitors.length;
  const up = monitors.filter(
    (m) => m.status === "operational" || m.status === "degraded"
  ).length;
  const down = monitors.filter((m) => m.status === "down").length;
  const avgUptime =
    total === 0
      ? 0
      : monitors.reduce((s, m) => s + m.uptimePct, 0) / total;
  return {
    total,
    up,
    down,
    avgUptimePct: Math.round(avgUptime * 100) / 100,
  };
}

export function formatRelativeTime(d: Date | null): string {
  if (!d) return "Never";
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

export type HourlyChartPoint = {
  label: string;
  uptimePct: number;
  avgResponseMs: number | null;
};

/** Bucket monitor checks into fixed hourly windows for the last `bucketCount` hours. */
export function aggregateChecksToHourlyBuckets(
  checks: {
    checked_at: string | null;
    status: string;
    response_time: number | null;
  }[],
  bucketCount = 24
): HourlyChartPoint[] {
  const now = Date.now();
  const bucketMs = 60 * 60 * 1000;
  const start = now - bucketCount * bucketMs;
  const buckets: HourlyChartPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bStart = start + i * bucketMs;
    const bEnd = bStart + bucketMs;
    const label = new Date(bStart).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const inB = checks.filter((c) => {
      if (!c.checked_at) return false;
      const t0 = new Date(c.checked_at).getTime();
      return t0 >= bStart && t0 < bEnd;
    });
    const healthy = inB.filter(
      (c) => c.status === "up" || c.status === "degraded"
    ).length;
    const uptimePct =
      inB.length === 0
        ? 100
        : Math.round((healthy / inB.length) * 10000) / 100;
    const rts = inB
      .map((c) => c.response_time)
      .filter((n): n is number => n != null && !Number.isNaN(n));
    const avgResponseMs =
      rts.length === 0
        ? null
        : Math.round(rts.reduce((a, b) => a + b, 0) / rts.length);
    buckets.push({ label, uptimePct, avgResponseMs });
  }
  return buckets;
}

/** Human-friendly relative time for monitor rows (e.g. "2 mins ago"). */
export function formatRelativeTimeFriendly(d: Date | null): string {
  if (!d) return "Never checked";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min === 1) return "1 min ago";
  if (min < 60) return `${min} mins ago`;
  const h = Math.floor(min / 60);
  if (h === 1) return "1 hour ago";
  if (h < 48) return `${h} hours ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
