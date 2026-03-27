import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { normalizeSupabaseError } from "@/lib/supabase-errors";

/**
 * Readiness check: can PostgREST see `public.monitors` with the server service key?
 * GET /api/health/supabase → { ok, code?, message? }
 */
export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("monitors").select("id").limit(1);
    if (error) {
      const e = normalizeSupabaseError(error);
      const res = NextResponse.json({
        ok: false,
        code: e.code ?? null,
        message: e.message ?? "Unknown error",
      });
      return applyApiCors(request, res);
    }
    const res = NextResponse.json({ ok: true });
    return applyApiCors(request, res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const res = NextResponse.json(
      {
        ok: false,
        code: "CONFIG",
        message: msg,
      },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
}
