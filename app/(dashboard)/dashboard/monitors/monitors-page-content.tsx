import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MonitorsView } from "@/components/monitors/monitors-view";
import { getMonitors } from "@/lib/actions/monitors";
import {
  getLatestCheckByMonitorIds,
  monitorToListItem,
} from "@/lib/data/monitors";
import type { MonitorListItemSerialized } from "@/lib/dashboard-types";
import type { Monitor } from "@/lib/supabase";
import { isThrownSchemaMissingError } from "@/lib/supabase-errors";

function serializeItem(
  m: ReturnType<typeof monitorToListItem>
): MonitorListItemSerialized {
  return {
    ...m,
    lastChecked: m.lastChecked ? m.lastChecked.toISOString() : null,
    createdAt: m.createdAt ? m.createdAt.toISOString() : null,
  };
}

export async function MonitorsPageContent() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let raw: Monitor[] = [];
  try {
    raw = await getMonitors(userId);
  } catch (err) {
    if (isThrownSchemaMissingError(err)) {
      console.error(
        "[NetPulse] Monitors: tables missing (PGRST205). Run supabase/migrations in SQL Editor."
      );
    } else {
      console.error("MonitorsPage", err);
    }
    raw = [];
  }

  const ids = raw.map((m) => m.id);
  const latest = await getLatestCheckByMonitorIds(ids);
  const initialMonitors: MonitorListItemSerialized[] = raw.map((m) =>
    serializeItem(monitorToListItem(m, latest))
  );

  return (
    <MonitorsView initialMonitors={initialMonitors} userId={userId} />
  );
}
