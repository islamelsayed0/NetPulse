import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { IncidentsView } from "@/components/incidents/incidents-view";
import { getIncidentListForUser } from "@/lib/data/incidents";
import { getMonitorsForUser } from "@/lib/data/monitors";
import type {
  IncidentListItem,
  IncidentListItemSerialized,
} from "@/lib/dashboard-types";
import { isThrownSchemaMissingError } from "@/lib/supabase-errors";

function serializeIncident(i: IncidentListItem): IncidentListItemSerialized {
  return {
    ...i,
    startedAt: i.startedAt.toISOString(),
    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
  };
}

export async function IncidentsPageContent() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let list: IncidentListItem[] = [];
  try {
    list = await getIncidentListForUser(userId);
  } catch (err) {
    if (isThrownSchemaMissingError(err)) {
      console.error(
        "[NetPulse] Incidents: tables missing. Run supabase migrations in SQL Editor."
      );
    } else {
      console.error("IncidentsPage", err);
    }
    list = [];
  }

  let monitors: { id: string; name: string }[] = [];
  try {
    const raw = await getMonitorsForUser(userId);
    monitors = raw.map((m) => ({ id: m.id, name: m.name }));
  } catch {
    monitors = [];
  }

  const initialIncidents = list.map(serializeIncident);

  return (
    <IncidentsView
      initialIncidents={initialIncidents}
      monitorOptions={monitors}
    />
  );
}
