import { NextResponse } from "next/server";
import type { PlatformCheckResult } from "./types";

export function jsonHealthResponse(result: PlatformCheckResult): NextResponse {
  const healthy = result.status === "up";
  return NextResponse.json(
    {
      ok: healthy,
      status: result.status,
      latencyMs: result.latencyMs,
      checkedAt: result.checkedAtIso,
      detail: result.detail ?? null,
    },
    { status: healthy ? 200 : 503 }
  );
}
