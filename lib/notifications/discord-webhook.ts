/** Discord embed colors (decimal) — legacy / test helpers. */
export const DISCORD_EMBED_RED = 0xe74c3c;
export const DISCORD_EMBED_GREEN = 0x57f287;

/** Alert palette per product spec. */
export const DISCORD_ALERT_DOWN_COLOR = 16711680;
export const DISCORD_ALERT_RECOVERED_COLOR = 3899566;

const NETPULSE_MONITORING_FOOTER = "NetPulse Monitoring";

export function normalizeDiscordWebhookUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (host !== "discord.com" && host !== "discordapp.com") return null;
    if (!u.pathname.startsWith("/api/webhooks/")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

type DiscordEmbedField = { name: string; value: string; inline?: boolean };

type DiscordEmbed = {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: { text: string };
};

export async function postDiscordWebhook(
  webhookUrl: string,
  embed: DiscordEmbed
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NetPulse",
        embeds: [embed],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: text || `Discord returned ${res.status}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Webhook request failed",
    };
  }
}

export async function postDiscordTestEmbed(
  webhookUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return postDiscordWebhook(webhookUrl, {
    title: "NetPulse — webhook test",
    description: "Your Discord integration is configured correctly.",
    color: DISCORD_EMBED_GREEN,
    timestamp: new Date().toISOString(),
  });
}

export async function postMonitorDiscordEmbed(
  webhookUrl: string,
  input: {
    monitorName: string;
    monitorUrl: string;
    statusLabel: string;
    timestampIso: string;
    recovered: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const color = input.recovered ? DISCORD_EMBED_GREEN : DISCORD_EMBED_RED;
  const title = input.recovered
    ? `Monitor recovered: ${input.monitorName}`
    : `Monitor down: ${input.monitorName}`;

  return postDiscordWebhook(webhookUrl, {
    title,
    color,
    fields: [
      { name: "URL", value: input.monitorUrl || "—", inline: false },
      { name: "Status", value: input.statusLabel, inline: true },
      { name: "Time (UTC)", value: input.timestampIso, inline: true },
    ],
    timestamp: input.timestampIso,
  });
}

export async function postMonitorDownAlertEmbed(
  webhookUrl: string,
  input: {
    monitorName: string;
    monitorUrl: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    timeIso: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  return postDiscordWebhook(webhookUrl, {
    title: `🚨 Monitor Down — ${input.monitorName}`,
    color: DISCORD_ALERT_DOWN_COLOR,
    fields: [
      { name: "URL", value: input.monitorUrl || "—", inline: false },
      {
        name: "Status Code",
        value:
          input.statusCode != null ? String(input.statusCode) : "—",
        inline: true,
      },
      {
        name: "Response Time",
        value:
          input.responseTimeMs != null ? `${input.responseTimeMs} ms` : "—",
        inline: true,
      },
      { name: "Time", value: input.timeIso, inline: false },
    ],
    footer: { text: NETPULSE_MONITORING_FOOTER },
  });
}

export async function postMonitorRecoveredAlertEmbed(
  webhookUrl: string,
  input: {
    monitorName: string;
    monitorUrl: string;
    timeIso: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  return postDiscordWebhook(webhookUrl, {
    title: `✅ Monitor Recovered — ${input.monitorName}`,
    color: DISCORD_ALERT_RECOVERED_COLOR,
    fields: [
      { name: "URL", value: input.monitorUrl || "—", inline: false },
      { name: "Time", value: input.timeIso, inline: false },
    ],
    footer: { text: NETPULSE_MONITORING_FOOTER },
  });
}
