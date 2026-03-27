import { Resend } from "resend";
import { USER_SETTINGS_DEFAULTS } from "@/lib/data/user-settings";
import type { UserSettings } from "@/lib/supabase";

let resendMissingLogged = false;
let resendFromMissingLogged = false;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (!resendMissingLogged) {
      resendMissingLogged = true;
      console.error(
        "[NetPulse] RESEND_API_KEY is not set; alert emails are skipped."
      );
    }
    return null;
  }
  return new Resend(key);
}

function getFrom(): string | undefined {
  const from = process.env.RESEND_FROM?.trim();
  return from || undefined;
}

export async function sendMonitorAlertEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const resend = getResend();
  const from = getFrom();
  if (!resend) return;
  if (!from) {
    if (!resendFromMissingLogged) {
      resendFromMissingLogged = true;
      console.error(
        "[NetPulse] RESEND_FROM is not set; alert emails are skipped."
      );
    }
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (error) {
    console.error("[NetPulse] Resend send failed", error);
  }
}

/** Merge DB row with defaults for notification flags and channels. */
export function effectiveNotificationPrefs(
  row: UserSettings | null
): {
  notification_email: string | null;
  email_on_down: boolean;
  email_on_recovery: boolean;
  discord_webhook: string | null;
} {
  return {
    notification_email:
      row?.notification_email ?? USER_SETTINGS_DEFAULTS.notification_email,
    email_on_down: row?.email_on_down ?? USER_SETTINGS_DEFAULTS.email_on_down,
    email_on_recovery:
      row?.email_on_recovery ?? USER_SETTINGS_DEFAULTS.email_on_recovery,
    discord_webhook:
      row?.discord_webhook ?? USER_SETTINGS_DEFAULTS.discord_webhook,
  };
}
