import type { Monitor, UserSettings } from "@/lib/supabase";
import {
  sendMonitorDownEmail,
  sendMonitorRecoveryEmail,
} from "@/lib/email";
import {
  postMonitorDownAlertEmbed,
  postMonitorRecoveredAlertEmbed,
} from "@/lib/notifications/discord-webhook";
import { effectiveNotificationPrefs } from "@/lib/notifications/resend-alerts";

export type MonitorDownNotifyContext = {
  statusCode: number | null;
  responseTime: number | null;
  errorMessage: string | null;
  checkedAtIso: string;
};

export type MonitorRecoveredNotifyContext = {
  checkedAtIso: string;
  /** Human-readable outage length (e.g. "12 minutes") */
  downtime: string;
};

export async function notifyMonitorDown(
  monitor: Monitor,
  settingsRow: UserSettings | null,
  ctx: MonitorDownNotifyContext
): Promise<void> {
  const p = effectiveNotificationPrefs(settingsRow);
  const ts = ctx.checkedAtIso;

  if (p.email_on_down) {
    const email =
      p.notification_email?.trim() || monitor.notification_email?.trim();
    if (email) {
      try {
        const r = await sendMonitorDownEmail(
          email,
          monitor.name,
          monitor.url,
          ctx.responseTime
        );
        if (!r.ok) {
          console.error("[NetPulse] notifyMonitorDown email", r.error);
        }
      } catch (e) {
        console.error("[NetPulse] notifyMonitorDown email", e);
      }
    }
  }

  const hook = p.discord_webhook?.trim();
  if (hook) {
    try {
      const r = await postMonitorDownAlertEmbed(hook, {
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        statusCode: ctx.statusCode,
        responseTimeMs: ctx.responseTime,
        timeIso: ts,
      });
      if (!r.ok) {
        console.error("[NetPulse] notifyMonitorDown discord", r.error);
      }
    } catch (e) {
      console.error("[NetPulse] notifyMonitorDown discord", e);
    }
  }
}

export async function notifyMonitorRecovered(
  monitor: Monitor,
  settingsRow: UserSettings | null,
  ctx: MonitorRecoveredNotifyContext
): Promise<void> {
  const p = effectiveNotificationPrefs(settingsRow);
  const ts = ctx.checkedAtIso;

  if (p.email_on_recovery) {
    const email =
      p.notification_email?.trim() || monitor.notification_email?.trim();
    if (email) {
      try {
        const r = await sendMonitorRecoveryEmail(
          email,
          monitor.name,
          monitor.url,
          ctx.downtime
        );
        if (!r.ok) {
          console.error("[NetPulse] notifyMonitorRecovered email", r.error);
        }
      } catch (e) {
        console.error("[NetPulse] notifyMonitorRecovered email", e);
      }
    }
  }

  const hook = p.discord_webhook?.trim();
  if (hook) {
    try {
      const r = await postMonitorRecoveredAlertEmbed(hook, {
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        timeIso: ts,
      });
      if (!r.ok) {
        console.error("[NetPulse] notifyMonitorRecovered discord", r.error);
      }
    } catch (e) {
      console.error("[NetPulse] notifyMonitorRecovered discord", e);
    }
  }
}
