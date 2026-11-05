import type { PrismaClient } from "@prisma/client";

import { sendToUser, type PushPayload } from "@/server/push";

/** How long a Notification stays in Earlier (ADR 0012). */
export const EARLIER_DAYS = 30;

/**
 * Sends a Notification and records it in Earlier. The record is written first and whether or not the Member has
 * push on, so the Notification centre still shows what a phone never received (ADR 0012). Returns how many devices
 * the push reached.
 */
export async function notifyUser(prisma: PrismaClient, userId: string, payload: PushPayload): Promise<number> {
  await prisma.notification.create({
    data: { userId, title: payload.title, body: payload.body, url: payload.url },
  });
  return sendToUser(prisma, userId, payload);
}

/** Deletes entries older than `EARLIER_DAYS`. Run by the daily job. Returns how many were removed. */
export async function purgeOldEarlier(prisma: PrismaClient, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - EARLIER_DAYS * 86_400_000);
  const { count } = await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
