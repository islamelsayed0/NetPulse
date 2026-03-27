import type {
  IncidentRow,
  MonitorRow,
  UptimeDayPoint,
} from "@/lib/dashboard-types";

export const MOCK_UPTIME_SERIES: UptimeDayPoint[] = [
  { day: "Mon", uptimePct: 99.2 },
  { day: "Tue", uptimePct: 99.8 },
  { day: "Wed", uptimePct: 98.4 },
  { day: "Thu", uptimePct: 100 },
  { day: "Fri", uptimePct: 99.5 },
  { day: "Sat", uptimePct: 99.9 },
  { day: "Sun", uptimePct: 99.7 },
];

export const MOCK_MONITORS: MonitorRow[] = [
  {
    id: "1",
    name: "API Gateway",
    url: "https://api.netpulse.app/health",
    status: "operational",
    uptimePct: 99.94,
    lastChecked: new Date(Date.now() - 45_000),
  },
  {
    id: "2",
    name: "Auth service",
    url: "https://auth.netpulse.app/status",
    status: "operational",
    uptimePct: 99.88,
    lastChecked: new Date(Date.now() - 120_000),
  },
  {
    id: "3",
    name: "Edge CDN",
    url: "https://cdn.netpulse.app/ping",
    status: "degraded",
    uptimePct: 97.12,
    lastChecked: new Date(Date.now() - 300_000),
  },
  {
    id: "4",
    name: "Legacy billing worker",
    url: "10.0.4.18:8080",
    status: "down",
    uptimePct: 82.4,
    lastChecked: new Date(Date.now() - 900_000),
  },
  {
    id: "5",
    name: "Status page",
    url: "https://status.netpulse.app",
    status: "operational",
    uptimePct: 100,
    lastChecked: new Date(Date.now() - 60_000),
  },
];

export const MOCK_INCIDENTS: IncidentRow[] = [
  {
    id: "i1",
    severity: "critical",
    service: "Edge CDN",
    description: "Elevated error rate in eu-west — investigating origin timeouts",
    timestamp: new Date(Date.now() - 3_600_000),
    status: "active",
  },
  {
    id: "i2",
    severity: "warning",
    service: "Auth service",
    description: "JWT validation latency above SLO for 12 minutes",
    timestamp: new Date(Date.now() - 8_640_000),
    status: "resolved",
  },
  {
    id: "i3",
    severity: "critical",
    service: "Legacy billing worker",
    description: "Process crash loop — on-call paged",
    timestamp: new Date(Date.now() - 86_400_000),
    status: "resolved",
  },
];

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

export function formatRelativeTime(d: Date): string {
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
