import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getIncidents } from "@/lib/actions/incidents";
import {
  getMonitors,
  getUptimeSeriesForUser,
} from "@/lib/actions/monitors";
import {
  getEmptyUptimeWeekSeries,
  monitorRowToViewModel,
  type UptimeDayPoint,
} from "@/lib/data/monitors";
import type { IncidentRow } from "@/lib/dashboard-types";
import type { Monitor } from "@/lib/supabase";
import { isThrownSchemaMissingError } from "@/lib/supabase-errors";

function logDashboardDataFailure(
  area: "monitors" | "incidents",
  err: unknown,
  schemaHintLoggedRef: { current: boolean }
) {
  if (isThrownSchemaMissingError(err)) {
    if (!schemaHintLoggedRef.current) {
      schemaHintLoggedRef.current = true;
      console.error(
        "[NetPulse] Supabase tables are missing (PGRST205). Run supabase/migrations/001_initial_schema.sql in the SQL Editor for the project in NEXT_PUBLIC_SUPABASE_URL, then reload. Open /api/health/supabase to verify (ok: true)."
      );
    }
    return;
  }
  console.error(`DashboardHomePage: ${area} unavailable`, err);
}

export async function DashboardHomeContent() {
  const { userId } = await auth();
  // #region agent log
  fetch("http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d60220",
    },
    body: JSON.stringify({
      sessionId: "d60220",
      runId: "pre-fix",
      hypothesisId: "H3-H5",
      location: "dashboard-home-content.tsx:auth",
      message: "dashboard auth",
      data: { hasUserId: Boolean(userId) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!userId) {
    redirect("/sign-in");
  }

  const schemaHintLogged = { current: false };

  let rawMonitors: Monitor[] = [];
  let monitorsQueryFailed = false;
  let monitorsErrSnippet: string | undefined;
  try {
    rawMonitors = await getMonitors(userId);
  } catch (err) {
    monitorsQueryFailed = true;
    monitorsErrSnippet = String(err).slice(0, 120);
    logDashboardDataFailure("monitors", err, schemaHintLogged);
  }
  // #region agent log
  fetch("http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d60220",
    },
    body: JSON.stringify({
      sessionId: "d60220",
      runId: "pre-fix",
      hypothesisId: "H1-H2-H5",
      location: "dashboard-home-content.tsx:monitors",
      message: "monitors load outcome",
      data: {
        failed: monitorsQueryFailed,
        monitorCount: rawMonitors.length,
        monitorsErrSnippet,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  let uptimeSeries: UptimeDayPoint[];
  if (monitorsQueryFailed) {
    uptimeSeries = getEmptyUptimeWeekSeries();
  } else {
    uptimeSeries = await getUptimeSeriesForUser(userId);
  }

  let incidents: IncidentRow[] = [];
  let incidentsFailed = false;
  let incidentsErrSnippet: string | undefined;
  try {
    incidents = await getIncidents(userId);
  } catch (err) {
    incidentsFailed = true;
    incidentsErrSnippet = String(err).slice(0, 120);
    logDashboardDataFailure("incidents", err, schemaHintLogged);
  }
  // #region agent log
  fetch("http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d60220",
    },
    body: JSON.stringify({
      sessionId: "d60220",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "dashboard-home-content.tsx:incidents",
      message: "incidents load outcome",
      data: {
        failed: incidentsFailed,
        incidentCount: incidents.length,
        incidentsErrSnippet,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const monitorRows = rawMonitors.map(monitorRowToViewModel);

  return (
    <DashboardView
      initialMonitors={monitorRows}
      initialIncidents={incidents}
      uptimeSeries={uptimeSeries}
      userId={userId}
    />
  );
}
