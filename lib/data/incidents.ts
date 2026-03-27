import {
  createAdminSupabaseClient,
  type Incident,
  type IncidentUpdate,
} from "@/lib/supabase";
import type {
  IncidentListItem,
  IncidentRow,
  IncidentSeverity,
} from "@/lib/dashboard-types";
import {
  sanitizeIncidentDescription,
  sanitizeIncidentTitle,
  sanitizeIncidentUpdateBody,
} from "@/lib/sanitize";
import {
  formatSupabaseError,
  isPgrstSchemaMissingError,
  missingTablesHint,
  normalizeSupabaseError,
} from "@/lib/supabase-errors";

export type CreateIncidentInput = {
  monitor_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  severity?: string;
};

export type UpdateIncidentInput = {
  title?: string;
  description?: string | null;
  severity?: string;
  monitor_id?: string;
};

function mapSeverity(s: string): IncidentSeverity {
  if (s === "critical") return "critical";
  if (s === "info") return "info";
  return "warning";
}

export function incidentToRow(
  row: Incident & { monitors?: { name: string } | null }
): IncidentRow {
  return {
    id: row.id,
    severity: mapSeverity(row.severity),
    service: row.monitors?.name ?? row.title,
    description: row.description ?? row.title,
    timestamp: row.started_at ? new Date(row.started_at) : new Date(),
    status: row.status === "resolved" ? "resolved" : "active",
  };
}

export function incidentToListItem(
  row: Incident & { monitors: { name: string } | null }
): IncidentListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: mapSeverity(row.severity),
    status: row.status === "resolved" ? "resolved" : "active",
    monitorId: row.monitor_id,
    monitorName: row.monitors?.name ?? "Unknown monitor",
    startedAt: row.started_at ? new Date(row.started_at) : new Date(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  };
}

async function fetchIncidentsJoined(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(
      `
      *,
      monitors ( name )
    `
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    if (!isPgrstSchemaMissingError(e)) {
      console.error("incidents fetch", shown);
    }
    throw new Error(
      `Failed to load incidents: ${shown}${missingTablesHint(e)}`
    );
  }
  return data ?? [];
}

export async function getIncidentsForUser(
  userId: string
): Promise<IncidentRow[]> {
  const rows = await fetchIncidentsJoined(userId);
  return rows.map((row) =>
    incidentToRow(row as Incident & { monitors: { name: string } | null })
  );
}

export async function getIncidentListForUser(
  userId: string
): Promise<IncidentListItem[]> {
  const rows = await fetchIncidentsJoined(userId);
  return rows.map((row) =>
    incidentToListItem(row as Incident & { monitors: { name: string } | null })
  );
}

export async function createIncident(
  data: CreateIncidentInput
): Promise<Incident> {
  const supabase = createAdminSupabaseClient();
  const title = sanitizeIncidentTitle(data.title);
  if (!title) {
    throw new Error("Title is required");
  }
  const { data: row, error } = await supabase
    .from("incidents")
    .insert({
      monitor_id: data.monitor_id,
      user_id: data.user_id,
      title,
      description: sanitizeIncidentDescription(data.description),
      severity: data.severity ?? "warning",
      status: "active",
    })
    .select()
    .single();
  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    console.error("createIncident", shown);
    throw new Error(
      `Failed to create incident: ${shown}${missingTablesHint(e)}`
    );
  }
  return row as Incident;
}

export async function resolveIncidentForUser(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("incidents")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing || existing.user_id !== userId) {
    if (fetchErr) {
      const fe = normalizeSupabaseError(fetchErr);
      console.error(
        "resolveIncidentForUser fetch",
        formatSupabaseError(fe) || fe.message || fetchErr
      );
    }
    throw new Error("Not found");
  }
  const { error } = await supabase
    .from("incidents")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    const e = normalizeSupabaseError(error);
    const detail = formatSupabaseError(e);
    const shown = detail || e.message || "Unknown database error";
    console.error("resolveIncidentForUser", shown);
    throw new Error(
      `Failed to resolve incident: ${shown}${missingTablesHint(e)}`
    );
  }
}

export async function deleteIncidentForUser(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("incidents")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing || existing.user_id !== userId) {
    throw new Error("Not found");
  }
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to delete incident: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
}

export async function updateIncidentForUser(
  userId: string,
  id: string,
  patch: UpdateIncidentInput
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("incidents")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing || existing.user_id !== userId) {
    throw new Error("Not found");
  }
  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const ti = sanitizeIncidentTitle(patch.title);
    if (!ti) throw new Error("Title cannot be empty");
    updates.title = ti;
  }
  if (patch.description !== undefined)
    updates.description = sanitizeIncidentDescription(patch.description);
  if (patch.severity !== undefined) updates.severity = patch.severity;
  if (patch.monitor_id !== undefined) updates.monitor_id = patch.monitor_id;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase
    .from("incidents")
    .update(updates)
    .eq("id", id);
  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to update incident: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
}

export async function assertIncidentOwned(
  userId: string,
  incidentId: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("user_id")
    .eq("id", incidentId)
    .maybeSingle();
  if (error || !data || data.user_id !== userId) {
    throw new Error("Not found");
  }
}

export async function addIncidentUpdateForUser(
  userId: string,
  incidentId: string,
  body: string
): Promise<IncidentUpdate> {
  const text = sanitizeIncidentUpdateBody(body);
  if (!text) {
    throw new Error("Update text is required");
  }
  await assertIncidentOwned(userId, incidentId);
  const supabase = createAdminSupabaseClient();
  const { data: row, error } = await supabase
    .from("incident_updates")
    .insert({
      incident_id: incidentId,
      user_id: userId,
      body: text,
    })
    .select()
    .single();
  if (error) {
    const e = normalizeSupabaseError(error);
    throw new Error(
      `Failed to add update: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
  return row as IncidentUpdate;
}

export async function getIncidentUpdatesForUser(
  userId: string,
  incidentId: string
): Promise<IncidentUpdate[]> {
  await assertIncidentOwned(userId, incidentId);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("incident_updates")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });
  if (error) {
    const e = normalizeSupabaseError(error);
    if (isPgrstSchemaMissingError(e)) {
      return [];
    }
    throw new Error(
      `Failed to load updates: ${formatSupabaseError(e) || e.message}${missingTablesHint(e)}`
    );
  }
  return (data ?? []) as IncidentUpdate[];
}
