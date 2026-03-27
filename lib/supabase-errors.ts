export type SupabaseQueryError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

/**
 * Normalizes PostgREST / Supabase errors (including `PostgrestError` subclasses)
 * so `message` / `code` are readable in logs and thrown `Error` text.
 */
export function normalizeSupabaseError(error: unknown): SupabaseQueryError {
  if (error == null) return {};
  if (typeof error === "object" && error instanceof Error) {
    const ex = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };
    return {
      message: ex.message || undefined,
      code: typeof ex.code === "string" ? ex.code : undefined,
      details: typeof ex.details === "string" ? ex.details : undefined,
      hint: typeof ex.hint === "string" ? ex.hint : undefined,
    };
  }
  if (typeof error === "object") {
    const o = error as Record<string, unknown>;
    return {
      message: typeof o.message === "string" ? o.message : undefined,
      code: typeof o.code === "string" ? o.code : undefined,
      details: typeof o.details === "string" ? o.details : undefined,
      hint: typeof o.hint === "string" ? o.hint : undefined,
    };
  }
  return { message: String(error) };
}

export function formatSupabaseError(error: SupabaseQueryError | null): string {
  if (!error?.message) return "";
  const bits = [error.message];
  if (error.code) bits.push(`[${error.code}]`);
  if (error.details) bits.push(error.details);
  if (error.hint) bits.push(`hint: ${error.hint}`);
  return bits.join(" ");
}

/** PostgREST: relation or column missing from schema cache */
export function missingTablesHint(error: SupabaseQueryError | null): string {
  if (error?.code === "PGRST205") {
    return " Create the tables by running supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor.";
  }
  if (
    error?.code === "PGRST204" &&
    error.message?.includes("discord_webhook")
  ) {
    return " Run supabase/migrations/006_discord_webhook.sql in the Supabase SQL Editor to add discord_webhook (and migrate from slack_webhook if needed).";
  }
  if (
    error?.code === "PGRST204" &&
    (error.message?.includes("notification_email") ||
      error.message?.includes("paused"))
  ) {
    return " Run supabase/migrations/003_monitor_notification_pause.sql in the Supabase SQL Editor to add notification_email and paused on monitors.";
  }
  return "";
}

/** True when PostgREST cannot find the table (migration not applied to this project). */
export function isPgrstSchemaMissingError(
  error: SupabaseQueryError | null
): boolean {
  return error?.code === "PGRST205";
}

/** For caught `Error` from our data layer (message embeds code when thrown). */
export function isThrownSchemaMissingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("PGRST205") || msg.includes("schema cache");
}
