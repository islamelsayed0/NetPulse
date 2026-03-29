"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  deleteMonitorForUser,
  getMonitorForUserById,
  getMonitorsForUser,
  getUptimeSeriesForUser as loadUptimeSeriesForUser,
  insertMonitor,
  setMonitorPausedForUser,
  updateMonitorForUser,
  type CreateMonitorInput,
  type UpdateMonitorInput,
  type UpdateMonitorResult,
} from "@/lib/data/monitors";
import { runChecksForMonitors } from "@/lib/monitoring/run-all-checks";
import type { Monitor } from "@/lib/supabase";

async function requireMatchingUserId(userId: string): Promise<string> {
  const { userId: authId } = await auth();
  if (!authId || authId !== userId) {
    throw new Error("Unauthorized");
  }
  return authId;
}

export async function getMonitors(userId: string) {
  await requireMatchingUserId(userId);
  return getMonitorsForUser(userId);
}

export async function getUptimeSeriesForUser(userId: string) {
  await requireMatchingUserId(userId);
  return loadUptimeSeriesForUser(userId);
}

export async function createMonitor(
  userId: string,
  data: CreateMonitorInput
): Promise<Monitor> {
  await requireMatchingUserId(userId);
  const monitor = await insertMonitor(userId, data);
  if (monitor.paused !== true) {
    try {
      await runChecksForMonitors([monitor]);
    } catch (e) {
      console.error("[NetPulse] initial check after createMonitor failed", e);
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monitors");
  const fresh = await getMonitorForUserById(userId, monitor.id);
  return fresh ?? monitor;
}

export async function deleteMonitor(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await deleteMonitorForUser(userId, id);
}

export async function updateMonitor(
  monitorId: string,
  patch: UpdateMonitorInput
): Promise<UpdateMonitorResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return updateMonitorForUser(userId, monitorId, patch);
}

export async function setMonitorPaused(
  monitorId: string,
  paused: boolean
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await setMonitorPausedForUser(userId, monitorId, paused);
}
