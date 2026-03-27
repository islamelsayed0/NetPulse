"use server";

import { INPUT_LIMITS } from "@/lib/constants";
import { sanitizePlainText } from "@/lib/sanitize";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  deleteAllMonitorsForUser,
  deleteUserSettingsForUser,
  upsertUserSettings,
} from "@/lib/data/user-settings";
import {
  normalizeDiscordWebhookUrl,
  postDiscordTestEmbed,
} from "@/lib/notifications/discord-webhook";

export type SettingsActionResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

const DOWNTIME_DELAYS = new Set([1, 2, 5]);

function unauthorized(): SettingsActionResult {
  return { ok: false, error: "Unauthorized" };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function saveNotificationSettings(input: {
  notification_email: string;
  email_on_down: boolean;
  email_on_recovery: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
}): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const email = sanitizePlainText(
    input.notification_email,
    INPUT_LIMITS.notificationEmail
  );
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const { warning } = await upsertUserSettings(userId, {
      notification_email: email || null,
      email_on_down: input.email_on_down,
      email_on_recovery: input.email_on_recovery,
      daily_summary: input.daily_summary,
      weekly_report: input.weekly_report,
    });
    revalidatePath("/settings");
    return { ok: true as const, ...(warning ? { warning } : {}) };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function saveAlertSettings(input: {
  response_time_threshold: number;
  downtime_delay: number;
  alert_cooldown: number;
}): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const rt = Math.floor(Number(input.response_time_threshold));
  const cd = Math.floor(Number(input.alert_cooldown));
  const dd = Math.floor(Number(input.downtime_delay));

  if (!Number.isFinite(rt) || rt < 100 || rt > 600_000) {
    return {
      ok: false,
      error: "Response time threshold must be between 100 and 600000 ms.",
    };
  }
  if (!DOWNTIME_DELAYS.has(dd)) {
    return { ok: false, error: "Invalid downtime delay." };
  }
  if (!Number.isFinite(cd) || cd < 1 || cd > 10_080) {
    return {
      ok: false,
      error: "Alert cooldown must be between 1 and 10080 minutes.",
    };
  }

  try {
    const { warning } = await upsertUserSettings(userId, {
      response_time_threshold: rt,
      downtime_delay: dd,
      alert_cooldown: cd,
    });
    revalidatePath("/settings");
    return { ok: true as const, ...(warning ? { warning } : {}) };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function saveDiscordIntegration(
  discord_webhook: string
): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const trimmed = sanitizePlainText(
    discord_webhook,
    INPUT_LIMITS.discordWebhookUrl
  );
  if (trimmed) {
    const normalized = normalizeDiscordWebhookUrl(trimmed);
    if (!normalized) {
      return {
        ok: false,
        error:
          "Enter a valid Discord webhook URL (https://discord.com/api/webhooks/…).",
      };
    }
    try {
      const { warning } = await upsertUserSettings(userId, {
        discord_webhook: normalized,
      });
      revalidatePath("/settings");
      return { ok: true as const, ...(warning ? { warning } : {}) };
    } catch (e) {
      return { ok: false, error: toErrorMessage(e) };
    }
  } else {
    try {
      const { warning } = await upsertUserSettings(userId, {
        discord_webhook: null,
      });
      revalidatePath("/settings");
      return { ok: true as const, ...(warning ? { warning } : {}) };
    } catch (e) {
      return { ok: false, error: toErrorMessage(e) };
    }
  }
}

export async function testDiscordWebhook(
  webhookUrl: string
): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const normalized = normalizeDiscordWebhookUrl(
    sanitizePlainText(webhookUrl, INPUT_LIMITS.discordWebhookUrl)
  );
  if (!normalized) {
    return {
      ok: false,
      error:
        "Enter a valid Discord webhook URL (https://discord.com/api/webhooks/…).",
    };
  }

  const result = await postDiscordTestEmbed(normalized);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function saveNotificationEmailIntegration(
  notification_email: string
): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const email = sanitizePlainText(
    notification_email,
    INPUT_LIMITS.notificationEmail
  );
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const { warning } = await upsertUserSettings(userId, {
      notification_email: email || null,
    });
    revalidatePath("/settings");
    return { ok: true as const, ...(warning ? { warning } : {}) };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function deleteAllMonitors(): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    await deleteAllMonitorsForUser(userId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/monitors");
    revalidatePath("/dashboard/incidents");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}

export async function deleteAccount(): Promise<SettingsActionResult> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    await deleteAllMonitorsForUser(userId);
    await deleteUserSettingsForUser(userId);
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }

  try {
    await (await clerkClient()).users.deleteUser(userId);
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }

  revalidatePath("/");
  return { ok: true };
}
