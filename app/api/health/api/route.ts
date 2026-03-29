import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";
import { checkApi } from "@/lib/platform-health/checks";
import { jsonHealthResponse } from "@/lib/platform-health/health-http";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const result = await checkApi();
  return applyApiCors(request, jsonHealthResponse(result));
}
