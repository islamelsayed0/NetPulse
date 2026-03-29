import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const start = performance.now();
  const checkedAt = new Date().toISOString();
  const latencyMs = Math.round(performance.now() - start);

  const key = process.env.RESEND_API_KEY?.trim();
  const valid = Boolean(key && key.startsWith("re_"));

  if (!valid) {
    const detail = !key
      ? "RESEND_API_KEY is not set"
      : "RESEND_API_KEY must start with re_";
    const res = NextResponse.json(
      {
        ok: false,
        status: "degraded",
        latencyMs,
        checkedAt,
        detail,
      },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }

  const res = NextResponse.json(
    {
      ok: true,
      status: "up",
      latencyMs,
      checkedAt,
      detail: null,
    },
    { status: 200 }
  );
  return applyApiCors(request, res);
}
