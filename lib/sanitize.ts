import { INPUT_LIMITS } from "@/lib/constants";

const CTRL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strip control characters, trim, and cap length for plain text stored in the DB. */
export function sanitizePlainText(raw: string, maxLen: number): string {
  return raw.replace(CTRL_CHARS, "").trim().slice(0, maxLen);
}

/** Normalize optional nullable text fields. */
export function sanitizeOptionalPlainText(
  raw: string | null | undefined,
  maxLen: number
): string | null {
  if (raw == null) return null;
  const s = sanitizePlainText(String(raw), maxLen);
  return s.length ? s : null;
}

export function sanitizeMonitorName(name: string): string {
  return sanitizePlainText(name, INPUT_LIMITS.monitorName);
}

export function sanitizeMonitorUrlForStorage(url: string): string {
  return sanitizePlainText(url, INPUT_LIMITS.monitorUrl);
}

export function sanitizeIncidentTitle(title: string): string {
  return sanitizePlainText(title, INPUT_LIMITS.incidentTitle);
}

export function sanitizeIncidentDescription(
  desc: string | null | undefined
): string | null {
  return sanitizeOptionalPlainText(desc, INPUT_LIMITS.incidentDescription);
}

export function sanitizeIncidentUpdateBody(body: string): string {
  return sanitizePlainText(body, INPUT_LIMITS.incidentUpdateBody);
}
