/** Field length limits for persisted user input */
export const INPUT_LIMITS = {
  monitorName: 200,
  monitorUrl: 2048,
  incidentTitle: 500,
  incidentDescription: 12_000,
  incidentUpdateBody: 12_000,
  discordWebhookUrl: 512,
  notificationEmail: 320,
} as const;

export const RATE_LIMIT = {
  checkMonitorsPerIpPerMinute: 30,
  checkMonitorsWindowMs: 60_000,
} as const;

export const STORAGE_KEYS = {
  sidebarCollapsed: "netpulse-sidebar-collapsed",
} as const;

/** Carbon & Cyan palette (reference for non-Tailwind contexts) */
export const THEME = {
  page: "#0d1117",
  surface: "#161b22",
  border: "#21262d",
  accent: "#22d3ee",
  heading: "#e6edf3",
  body: "#8b949e",
  success: "#3fb950",
  warning: "#f0b429",
  danger: "#f85149",
} as const;
