export const PLATFORM_SERVICE_KEYS = [
  "web",
  "api",
  "database",
  "auth",
  "notifications",
] as const;

export type PlatformServiceKey = (typeof PLATFORM_SERVICE_KEYS)[number];

export type ServiceHealthStatus = "up" | "degraded" | "down";

/** Heatmap cell: operational / degraded / down / no historical sample */
export type HeatmapDayStatus = "up" | "down" | "degraded" | "none";

export type PlatformCheckResult = {
  key: PlatformServiceKey;
  status: ServiceHealthStatus;
  latencyMs: number;
  checkedAtIso: string;
  detail?: string;
};
