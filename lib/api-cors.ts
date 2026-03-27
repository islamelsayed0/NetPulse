import { NextResponse } from "next/server";

function parseAllowedOrigins(): string[] {
  const raw = process.env.NETPULSE_API_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    return site ? [site.replace(/\/$/, "")] : [];
  }
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function applyApiCors(
  request: Request,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get("origin");
  if (!origin) {
    return response;
  }
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    return response;
  }
  if (allowed.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, x-cron-secret"
    );
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  return response;
}

export function corsPreflightResponse(request: Request): NextResponse | null {
  if (request.method !== "OPTIONS") {
    return null;
  }
  const res = new NextResponse(null, { status: 204 });
  return applyApiCors(request, res);
}
