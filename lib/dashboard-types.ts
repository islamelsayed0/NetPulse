export type MonitorHealth = "operational" | "down" | "degraded";

export type MonitorRow = {
  id: string;
  name: string;
  url: string;
  status: MonitorHealth;
  uptimePct: number;
  /** Null when the monitor has never been checked */
  lastChecked: Date | null;
};

/** Full row for the dedicated monitors page (server-built). */
export type MonitorListItem = MonitorRow & {
  monitorType: string;
  intervalMinutes: number;
  createdAt: Date | null;
  lastResponseMs: number | null;
  paused: boolean;
  notificationEmail: string | null;
};

/** JSON-safe props for client components (ISO date strings). */
export type MonitorListItemSerialized = Omit<
  MonitorListItem,
  "lastChecked" | "createdAt"
> & {
  lastChecked: string | null;
  createdAt: string | null;
};

export type IncidentSeverity = "critical" | "warning" | "info";

export type IncidentState = "active" | "resolved";

export type IncidentRow = {
  id: string;
  severity: IncidentSeverity;
  service: string;
  description: string;
  timestamp: Date;
  status: IncidentState;
};

/** Rich incident row for the incidents page (client-deserialized from ISO strings). */
export type IncidentListItem = {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentState;
  monitorId: string;
  monitorName: string;
  startedAt: Date;
  resolvedAt: Date | null;
};

export type IncidentListItemSerialized = {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentState;
  monitorId: string;
  monitorName: string;
  startedAt: string;
  resolvedAt: string | null;
};

export type IncidentUpdateSerialized = {
  id: string;
  body: string;
  createdAt: string;
};

export type UptimeDayPoint = {
  day: string;
  uptimePct: number;
};

export type MonitorType = "http" | "https" | "ping" | "tcp";

export type CheckIntervalMinutes = 1 | 5 | 10;
