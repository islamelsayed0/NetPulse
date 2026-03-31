import { NextResponse } from "next/server";
import { applyApiCors, corsPreflightResponse } from "@/lib/api-cors";

const CRONJOB_ORG_API = "https://api.cron-job.org";
const DEFAULT_MONITOR_URL =
  "https://netpulse-rose.vercel.app/api/check-monitors";
const NETPULSE_JOB_TITLE = "NetPulse monitor checks";

type CronJobListItem = {
  jobId: number;
  url: string;
  title?: string;
  enabled?: boolean;
};

type JobsListResponse = {
  jobs?: CronJobListItem[];
};

function monitorTargetUrl(): string {
  return (
    process.env.NETPULSE_CRON_MONITOR_URL?.trim() || DEFAULT_MONITOR_URL
  );
}

function normalizeMonitorUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.origin}${path}`;
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function matchesNetPulseMonitorJob(jobUrl: string): boolean {
  return normalizeMonitorUrl(jobUrl) === normalizeMonitorUrl(monitorTargetUrl());
}

function authorizeSetup(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  const bearer =
    auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  return bearer === cronSecret || headerSecret === cronSecret;
}

async function cronOrgRequest(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const key = process.env.CRONJOB_API_KEY?.trim();
  if (!key) {
    throw new Error("CRONJOB_API_KEY missing");
  }
  return fetch(`${CRONJOB_ORG_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
}

export async function OPTIONS(request: Request) {
  return (
    corsPreflightResponse(request) ?? new NextResponse(null, { status: 204 })
  );
}

export async function GET(request: Request) {
  if (!authorizeSetup(request)) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return applyApiCors(request, res);
  }
  if (!process.env.CRONJOB_API_KEY?.trim()) {
    const res = NextResponse.json(
      { error: "CRONJOB_API_KEY is not configured" },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }
  try {
    const r = await cronOrgRequest("/jobs", { method: "GET" });
    if (!r.ok) {
      const text = await r.text();
      const res = NextResponse.json(
        {
          error: "cron-job.org API error",
          status: r.status,
          detail: text.slice(0, 500),
        },
        { status: 502 }
      );
      return applyApiCors(request, res);
    }
    const data = (await r.json()) as JobsListResponse;
    const jobs = data.jobs ?? [];
    const hit = jobs.find((j) => matchesNetPulseMonitorJob(j.url));
    const res = NextResponse.json({
      exists: Boolean(hit),
      job: hit
        ? {
            jobId: hit.jobId,
            url: hit.url,
            title: hit.title,
            enabled: hit.enabled,
          }
        : null,
      targetUrl: monitorTargetUrl(),
    });
    return applyApiCors(request, res);
  } catch (e) {
    console.error("[NetPulse] cron/setup GET", e);
    const res = NextResponse.json(
      { error: "Failed to query cron-job.org" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
}

export async function POST(request: Request) {
  if (!authorizeSetup(request)) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return applyApiCors(request, res);
  }
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    const res = NextResponse.json(
      { error: "CRON_SECRET is not set" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
  if (!process.env.CRONJOB_API_KEY?.trim()) {
    const res = NextResponse.json(
      { error: "CRONJOB_API_KEY is not configured" },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }
  try {
    const listRes = await cronOrgRequest("/jobs", { method: "GET" });
    if (!listRes.ok) {
      const res = NextResponse.json(
        { error: "Failed to list jobs from cron-job.org" },
        { status: 502 }
      );
      return applyApiCors(request, res);
    }
    const listData = (await listRes.json()) as JobsListResponse;
    const existing = (listData.jobs ?? []).find((j) =>
      matchesNetPulseMonitorJob(j.url)
    );
    if (existing) {
      const res = NextResponse.json({
        ok: true,
        alreadyExists: true,
        jobId: existing.jobId,
        message:
          "A cron job for this NetPulse monitor URL already exists on cron-job.org",
      });
      return applyApiCors(request, res);
    }

    const url = monitorTargetUrl();
    const body = {
      job: {
        title: NETPULSE_JOB_TITLE,
        url,
        enabled: true,
        saveResponses: false,
        requestMethod: 1,
        requestTimeout: 300,
        schedule: {
          timezone: "UTC",
          expiresAt: 0,
          hours: [-1],
          mdays: [-1],
          minutes: [-1],
          months: [-1],
          wdays: [-1],
        },
        extendedData: {
          headers: {
            "x-cron-secret": cronSecret,
          },
        },
      },
    };

    const createRes = await cronOrgRequest("/jobs", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (!createRes.ok) {
      const text = await createRes.text();
      console.error(
        "[NetPulse] cron-job.org PUT failed",
        createRes.status,
        text
      );
      const res = NextResponse.json(
        {
          error: "cron-job.org rejected job creation",
          status: createRes.status,
          detail: text.slice(0, 500),
        },
        { status: 502 }
      );
      return applyApiCors(request, res);
    }
    const created = (await createRes.json()) as { jobId?: number };
    const res = NextResponse.json({
      ok: true,
      alreadyExists: false,
      jobId: created.jobId,
      url,
    });
    return applyApiCors(request, res);
  } catch (e) {
    console.error("[NetPulse] cron/setup POST", e);
    const res = NextResponse.json(
      { error: "Failed to create cron job" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
}

export async function DELETE(request: Request) {
  if (!authorizeSetup(request)) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return applyApiCors(request, res);
  }
  if (!process.env.CRONJOB_API_KEY?.trim()) {
    const res = NextResponse.json(
      { error: "CRONJOB_API_KEY is not configured" },
      { status: 503 }
    );
    return applyApiCors(request, res);
  }
  try {
    const listRes = await cronOrgRequest("/jobs", { method: "GET" });
    if (!listRes.ok) {
      const res = NextResponse.json(
        { error: "Failed to list jobs from cron-job.org" },
        { status: 502 }
      );
      return applyApiCors(request, res);
    }
    const listData = (await listRes.json()) as JobsListResponse;
    const existing = (listData.jobs ?? []).find((j) =>
      matchesNetPulseMonitorJob(j.url)
    );
    if (!existing) {
      const res = NextResponse.json(
        { error: "No NetPulse monitor cron job found for target URL" },
        { status: 404 }
      );
      return applyApiCors(request, res);
    }

    const delRes = await cronOrgRequest(`/jobs/${existing.jobId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) {
      const text = await delRes.text();
      const res = NextResponse.json(
        {
          error: "cron-job.org failed to delete job",
          status: delRes.status,
          detail: text.slice(0, 500),
        },
        { status: 502 }
      );
      return applyApiCors(request, res);
    }
    const res = NextResponse.json({
      ok: true,
      deletedJobId: existing.jobId,
    });
    return applyApiCors(request, res);
  } catch (e) {
    console.error("[NetPulse] cron/setup DELETE", e);
    const res = NextResponse.json(
      { error: "Failed to delete cron job" },
      { status: 500 }
    );
    return applyApiCors(request, res);
  }
}
