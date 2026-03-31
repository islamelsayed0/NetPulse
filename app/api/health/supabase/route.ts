import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";

/**
 * Config-only readiness: Supabase URL + server key (no PostgREST request).
 * GET /api/health/supabase
 */
export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url) {
    const res = NextResponse.json(
      {
        ok: false,
        status: "degraded",
        code: "CONFIG",
        message: "NEXT_PUBLIC_SUPABASE_URL is not configured",
      },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }
  if (!serviceKey) {
    const res = NextResponse.json(
      {
        ok: false,
        status: "degraded",
        code: "CONFIG",
        message:
          "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is not configured",
      },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }

  const res = NextResponse.json({ ok: true, status: "operational" });
  return applyApiCors(request, res);
}
