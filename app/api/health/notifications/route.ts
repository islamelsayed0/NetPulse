import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";
import {
  integrationEnvDetail,
  missingIntegrationEnvVars,
} from "@/lib/platform-health/integration-env";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const start = performance.now();
  const checkedAt = new Date().toISOString();
  const latencyMs = Math.round(performance.now() - start);

  const missing = missingIntegrationEnvVars();
  if (missing.length > 0) {
    const res = NextResponse.json(
      {
        ok: false,
        status: "degraded",
        latencyMs,
        checkedAt,
        detail: integrationEnvDetail(missing),
      },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }

  const res = NextResponse.json(
    {
      ok: true,
      status: "operational",
      latencyMs,
      checkedAt,
      detail: null,
    },
    { status: 200 }
  );
  return applyApiCors(request, res);
}
