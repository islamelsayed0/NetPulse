import { createAdminSupabaseClient, type UserSettings } from "@/lib/supabase";
import {
  formatSupabaseError,
  isPgrstSchemaMissingError,
  missingTablesHint,
  normalizeSupabaseError,
} from "@/lib/supabase-errors";

/** Defaults when no row exists (must match migration 005_user_settings.sql). */
export const USER_SETTINGS_DEFAULTS: Omit<
  UserSettings,
  "id" | "user_id" | "created_at" | "updated_at"
> = {
  notification_email: null,
  email_on_down: true,
  email_on_recovery: true,
  daily_summary: false,
  weekly_report: false,
  response_time_threshold: 5000,
  downtime_delay: 1,
  alert_cooldown: 30,
  discord_webhook: null,
};

export type UserSettingsPatch = Partial<{
  notification_email: string | null;
  email_on_down: boolean;
  email_on_recovery: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  response_time_threshold: number;
  downtime_delay: number;
  alert_cooldown: number;
  discord_webhook: string | null;
}>;

function throwDbError(context: string, error: unknown): never {
  const e = normalizeSupabaseError(error);
  const detail = formatSupabaseError(e);
  const shown = detail || e.message || "Unknown database error";
  if (!isPgrstSchemaMissingError(e)) {
    console.error(context, shown);
  }
  throw new Error(`${context}: ${shown}${missingTablesHint(e)}`);
}

export async function getUserSettingsForUser(
  userId: string
): Promise<UserSettings | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const e = normalizeSupabaseError(error);
    if (isPgrstSchemaMissingError(e)) {
      throw new Error(
        `Failed to load user settings: ${formatSupabaseError(e)}${missingTablesHint(e)}`
      );
    }
    throwDbError("getUserSettingsForUser", error);
  }

  return (data as UserSettings | null) ?? null;
}

/**
 * Upsert by `user_id`. Merges `patch` with existing row or schema defaults.
 */
export type UpsertUserSettingsResult = {
  settings: UserSettings;
  warning?: string;
};

export async function upsertUserSettings(
  userId: string,
  patch: UserSettingsPatch
): Promise<UpsertUserSettingsResult> {
  const supabase = createAdminSupabaseClient();
  const existing = await getUserSettingsForUser(userId);

  const merged: Record<string, unknown> = existing
    ? { ...existing, ...patch, user_id: userId }
    : { user_id: userId, ...USER_SETTINGS_DEFAULTS, ...patch };

  if (!existing) {
    delete merged.id;
    delete merged.created_at;
    delete merged.updated_at;
  } else {
    delete merged.created_at;
    delete merged.updated_at;
  }

  // Do not send discord_webhook unless this patch sets it. Defaults included it on
  // first insert, which breaks DBs that have not run 006_discord_webhook.sql (PGRST204).
  if (!Object.prototype.hasOwnProperty.call(patch, "discord_webhook")) {
    delete merged.discord_webhook;
  }

  const discordTouched = Object.prototype.hasOwnProperty.call(
    patch,
    "discord_webhook"
  );

  let { data, error } = await supabase
    .from("user_settings")
    .upsert(merged, { onConflict: "user_id" })
    .select("*")
    .single();

  const firstErr = error ? normalizeSupabaseError(error) : null;
  if (
    error &&
    firstErr?.code === "PGRST204" &&
    firstErr.message?.includes("discord_webhook") &&
    Object.prototype.hasOwnProperty.call(merged, "discord_webhook")
  ) {
    const { discord_webhook: _, ...rest } = merged;
    const r2 = await supabase
      .from("user_settings")
      .upsert(rest, { onConflict: "user_id" })
      .select("*")
      .single();
    if (!r2.error && r2.data) {
      return {
        settings: r2.data as UserSettings,
        ...(discordTouched
          ? {
              warning:
                "Discord webhook was not saved — the database is missing the discord_webhook column. Run supabase/migrations/006_discord_webhook.sql in the Supabase SQL Editor. Other settings in this save were kept.",
            }
          : {}),
      };
    }
    error = r2.error;
    data = r2.data;
  }

  if (error) {
    throwDbError("upsertUserSettings", error);
  }

  return { settings: data as UserSettings };
}

export async function deleteAllMonitorsForUser(userId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("monitors").delete().eq("user_id", userId);
  if (error) {
    throwDbError("deleteAllMonitorsForUser", error);
  }
}

export async function deleteUserSettingsForUser(userId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("user_settings").delete().eq("user_id", userId);
  if (error) {
    const e = normalizeSupabaseError(error);
    if (isPgrstSchemaMissingError(e)) return;
    throwDbError("deleteUserSettingsForUser", error);
  }
}
