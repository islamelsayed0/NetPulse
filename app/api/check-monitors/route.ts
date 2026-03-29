import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";
import { RATE_LIMIT } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { runAllMonitorChecks } from "@/lib/monitoring/run-all-checks";

/**
 * Monitor checks (cron). On down/up transitions, `runAllMonitorChecks` loads
 * `user_settings` (notification_email, email_on_down, email_on_recovery) and
 * sends HTML alerts via `lib/email.ts` when enabled.
 */
export const maxDuration = 300;

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    return xf.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = checkRateLimit(
    `check-monitors:${ip}`,
    RATE_LIMIT.checkMonitorsPerIpPerMinute,
    RATE_LIMIT.checkMonitorsWindowMs
  );
  if (!rl.ok) {
    const res = NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
    return applyApiCors(request, res);
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[NetPulse] CRON_SECRET is not set");
    const res = NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }

  const auth = request.headers.get("authorization");
  const bearer =
    auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const authorized = bearer === cronSecret || headerSecret === cronSecret;
  if (!authorized) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return applyApiCors(request, res);
  }

  try {
    const { checked, results } = await runAllMonitorChecks();
    const res = NextResponse.json({
      ok: true,
      checked,
      results,
    });
    return applyApiCors(request, res);
  } catch (e) {
    console.error("[NetPulse] runAllMonitorChecks", e);
    const res = NextResponse.json(
      { error: "Failed to run monitor checks" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
}
