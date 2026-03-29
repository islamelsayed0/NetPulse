import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";
import { checkAuth } from "@/lib/platform-health/checks";
import { jsonHealthResponse } from "@/lib/platform-health/health-http";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const result = await checkAuth();
  return applyApiCors(request, jsonHealthResponse(result));
}
