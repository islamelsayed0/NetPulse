import { NextResponse } from "next/server";
import type { PlatformCheckResult } from "./types";

export function jsonHealthResponse(result: PlatformCheckResult): NextResponse {
  const down = result.status === "down";
  return NextResponse.json(
    {
      ok: !down,
      status: result.status,
      latencyMs: result.latencyMs,
      checkedAt: result.checkedAtIso,
      detail: result.detail ?? null,
    },
    { status: down ? 503 : 200 }
  );
}
