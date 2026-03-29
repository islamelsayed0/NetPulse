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
  if (!userId) {
    redirect("/sign-in");
  }

  const schemaHintLogged = { current: false };

  let rawMonitors: Monitor[] = [];
  let monitorsQueryFailed = false;
  try {
    rawMonitors = await getMonitors(userId);
  } catch (err) {
    monitorsQueryFailed = true;
    logDashboardDataFailure("monitors", err, schemaHintLogged);
  }

  let uptimeSeries: UptimeDayPoint[];
  if (monitorsQueryFailed) {
    uptimeSeries = getEmptyUptimeWeekSeries();
  } else {
    uptimeSeries = await getUptimeSeriesForUser(userId);
  }

  let incidents: IncidentRow[] = [];
  try {
    incidents = await getIncidents(userId);
  } catch (err) {
    logDashboardDataFailure("incidents", err, schemaHintLogged);
  }

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
