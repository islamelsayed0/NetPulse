import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";
import { runAllPlatformChecks } from "@/lib/platform-health/checks";
import { recordPlatformHealthDaily } from "@/lib/platform-health/record-snapshot";

/**
 * Hourly snapshot of platform health for the public 90-day heatmap.
 * Vercel Cron (GET) or manual call with CRON_SECRET.
 */
export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

function authorizeCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  const bearer =
    auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const header = request.headers.get("x-cron-secret")?.trim();
  return bearer === cronSecret || header === cronSecret;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    const res = NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
  if (!authorizeCron(request)) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return applyApiCors(request, res);
  }
  try {
    const results = await runAllPlatformChecks();
    await recordPlatformHealthDaily(results);
    const res = NextResponse.json({ ok: true, services: results.length });
    return applyApiCors(request, res);
  } catch (e) {
    console.error("[NetPulse] platform-health-snapshot", e);
    const res = NextResponse.json(
      { error: "Snapshot failed" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
}
