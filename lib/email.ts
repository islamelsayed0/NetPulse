import { Resend } from "resend";

/**
 * Resend only accepts verified senders. Custom @gmail.com addresses are rejected
 * unless you verify that domain in Resend (not possible for gmail.com).
 * Use RESEND_FROM, or default to Resend's sandbox sender for development.
 */
function normalizeResendFromAddress(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/<[^>]+>/.test(t)) return t;
  return `NetPulse <${t}>`;
}

function getResendFrom(): string {
  const from = process.env.RESEND_FROM?.trim();
  if (from) return normalizeResendFromAddress(from);
  return "NetPulse <onboarding@resend.dev>";
}

const PAGE = "#0d1117";
const SURFACE = "#161b22";
const BORDER = "#21262d";
const CYAN = "#22d3ee";
const CYAN_DIM = "#06b6d4";
const HEADING = "#e6edf3";
const BODY = "#8b949e";
const DANGER = "#f85149";
const SUCCESS = "#3fb950";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAGE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;border:1px solid ${BORDER};border-radius:12px;background:${SURFACE};overflow:hidden;">
          ${inner}
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:${BODY};">NetPulse Monitoring</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function rowPlain(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 24px 0 24px;font-size:12px;font-weight:600;color:${BODY};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</td>
</tr>
<tr>
  <td style="padding:4px 24px 12px 24px;font-size:15px;color:${HEADING};word-break:break-all;">${escapeHtml(value)}</td>
</tr>`;
}

function rowLink(label: string, url: string): string {
  const href = escapeHtml(url);
  const text = escapeHtml(url);
  return `<tr>
  <td style="padding:10px 24px 0 24px;font-size:12px;font-weight:600;color:${BODY};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</td>
</tr>
<tr>
  <td style="padding:4px 24px 12px 24px;font-size:15px;color:${HEADING};word-break:break-all;"><a href="${href}" style="color:${CYAN};text-decoration:none;">${text}</a></td>
</tr>`;
}

/**
 * Alert when a monitor fails. HTML uses Carbon dark surfaces and cyan accents.
 */
export async function sendMonitorDownEmail(
  email: string,
  monitorName: string,
  url: string,
  responseTime: number | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error("[NetPulse] RESEND_API_KEY is not set; down email skipped.");
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const resend = new Resend(key);
  const rt =
    responseTime != null && !Number.isNaN(responseTime)
      ? `${responseTime} ms`
      : "—";

  const header = `<tr>
  <td style="padding:24px 24px 16px 24px;border-bottom:1px solid ${BORDER};">
    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:${CYAN};text-transform:uppercase;letter-spacing:0.12em;">Alert</p>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:${HEADING};line-height:1.3;">Monitor down</h1>
    <p style="margin:10px 0 0 0;font-size:15px;color:${DANGER};font-weight:600;">${escapeHtml(monitorName)}</p>
  </td>
</tr>`;

  const body =
    rowLink("Endpoint", url) + rowPlain("Response time", rt);

  const footer = `<tr>
  <td style="padding:20px 24px 24px 24px;border-top:1px solid ${BORDER};">
    <p style="margin:0;font-size:13px;color:${BODY};line-height:1.5;">Investigate the target or network path. You will receive a separate message when the monitor recovers.</p>
  </td>
</tr>`;

  const html = shell(`Down: ${monitorName}`, header + body + footer);

  const from = getResendFrom();
  const { error, data } = await resend.emails.send({
    from,
    to: email.trim(),
    subject: `[NetPulse] Down: ${monitorName}`,
    html,
  });

  if (error) {
    const ex = error as Error & { statusCode?: number };
    console.error("[NetPulse] sendMonitorDownEmail Resend error", {
      from,
      message: error.message,
      name: error.name,
      statusCode: ex.statusCode,
    });
    return { ok: false, error: String(error.message ?? error) };
  }
  return { ok: true };
}

/**
 * Sent when a monitor returns to a healthy state after being down.
 * @param downtime — human-readable duration (e.g. "12 minutes")
 */
export async function sendMonitorRecoveryEmail(
  email: string,
  monitorName: string,
  url: string,
  downtime: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error("[NetPulse] RESEND_API_KEY is not set; recovery email skipped.");
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const resend = new Resend(key);

  const header = `<tr>
  <td style="padding:24px 24px 16px 24px;border-bottom:1px solid ${BORDER};">
    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:${CYAN};text-transform:uppercase;letter-spacing:0.12em;">Recovered</p>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:${HEADING};line-height:1.3;">Monitor back online</h1>
    <p style="margin:10px 0 0 0;font-size:15px;color:${SUCCESS};font-weight:600;">${escapeHtml(monitorName)}</p>
  </td>
</tr>`;

  const body = rowLink("Endpoint", url) + rowPlain("Downtime", downtime);

  const footer = `<tr>
  <td style="padding:20px 24px 24px 24px;border-top:1px solid ${BORDER};">
    <p style="margin:0;font-size:13px;color:${BODY};line-height:1.5;">No action required — this is a confirmation that the latest check succeeded.</p>
    <p style="margin:14px 0 0 0;font-size:12px;color:${CYAN_DIM};">NetPulse · Carbon &amp; Cyan</p>
  </td>
</tr>`;

  const html = shell(`Recovered: ${monitorName}`, header + body + footer);

  const from = getResendFrom();
  const { error, data } = await resend.emails.send({
    from,
    to: email.trim(),
    subject: `[NetPulse] Recovered: ${monitorName}`,
    html,
  });

  if (error) {
    const ex = error as Error & { statusCode?: number };
    console.error("[NetPulse] sendMonitorRecoveryEmail Resend error", {
      from,
      message: error.message,
      name: error.name,
      statusCode: ex.statusCode,
    });
    return { ok: false, error: String(error.message ?? error) };
  }
  return { ok: true };
}
