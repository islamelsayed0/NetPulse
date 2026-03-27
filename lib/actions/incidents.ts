"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  addIncidentUpdateForUser,
  createIncident,
  deleteIncidentForUser,
  getIncidentUpdatesForUser,
  getIncidentsForUser,
  resolveIncidentForUser,
  updateIncidentForUser,
  type CreateIncidentInput,
  type UpdateIncidentInput,
} from "@/lib/data/incidents";

async function requireMatchingUserId(userId: string): Promise<string> {
  const { userId: authId } = await auth();
  if (!authId || authId !== userId) {
    throw new Error("Unauthorized");
  }
  return authId;
}

export async function getIncidents(userId: string) {
  await requireMatchingUserId(userId);
  return getIncidentsForUser(userId);
}

export async function resolveIncident(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await resolveIncidentForUser(userId, id);
  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard");
}

export async function createIncidentAction(
  input: Omit<CreateIncidentInput, "user_id">
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await createIncident({ ...input, user_id: userId });
  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard");
}

export async function deleteIncidentAction(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await deleteIncidentForUser(userId, id);
  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard");
}

export async function updateIncidentAction(
  id: string,
  patch: UpdateIncidentInput
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await updateIncidentForUser(userId, id, patch);
  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard");
}

export async function addIncidentUpdateAction(
  incidentId: string,
  body: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await addIncidentUpdateForUser(userId, incidentId, body);
  revalidatePath("/dashboard/incidents");
}

export async function fetchIncidentUpdatesAction(incidentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const rows = await getIncidentUpdatesForUser(userId, incidentId);
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at ?? new Date().toISOString(),
  }));
}
