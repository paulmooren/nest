import type { PrismaClient } from "@prisma/client";

import { addInterval } from "@/lib/schedule";
import { VAULT_NOTIFY_DAYS } from "@/lib/vault";
import type { PushPayload } from "@/server/push";

export type Digest = { dueToday: string[]; overdue: string[]; vault: string[] };

/**
 * Who to tell what today: for each Member, the Reminders assigned to them (or
 * to Everyone) that fall due today, plus a single nudge for ones that are
 * exactly 2 days overdue. Anything overdue longer than that stays red in the
 * app but never notifies again. Vault dates (a passport's expiry, a warranty's end) are mentioned
 * once at 60 days and once at 14 days ahead, to the owner or, for Shared entries, to everyone.
 */
export async function buildDigests(prisma: PrismaClient, today: Date) {
  const twoDaysAgo = addInterval(today, -2, "DAY");
  const reminders = await prisma.reminder.findMany({
    where: { nextDueDate: { in: [today, twoDaysAgo] } },
    select: { title: true, ownerId: true, householdId: true, nextDueDate: true },
  });

  const vaultDates = VAULT_NOTIFY_DAYS.map((days) => addInterval(today, days, "DAY"));
  const vaultEntries = await prisma.vaultEntry.findMany({
    where: { expiresOn: { in: vaultDates } },
    select: { title: true, ownerId: true, householdId: true, expiresOn: true, expiryLabel: true },
  });

  const households = [...new Set([...reminders.map((r) => r.householdId), ...vaultEntries.map((e) => e.householdId)])];
  const members = await prisma.householdMember.findMany({
    where: { householdId: { in: households } },
    select: { userId: true, householdId: true },
  });

  const byUser = new Map<string, Digest>();
  const entryFor = (userId: string) => byUser.get(userId) ?? { dueToday: [], overdue: [], vault: [] };
  for (const e of vaultEntries) {
    const days = Math.round((e.expiresOn!.getTime() - today.getTime()) / 86_400_000);
    const recipients = e.ownerId ? [e.ownerId] : members.filter((m) => m.householdId === e.householdId).map((m) => m.userId);
    for (const userId of recipients) {
      const entry = entryFor(userId);
      entry.vault.push(`${e.title} (${(e.expiryLabel ?? "Expires").toLowerCase()} in ${days} days)`);
      byUser.set(userId, entry);
    }
  }
  for (const r of reminders) {
    const recipients = r.ownerId
      ? [r.ownerId]
      : members.filter((m) => m.householdId === r.householdId).map((m) => m.userId);
    for (const userId of recipients) {
      const entry = entryFor(userId);
      (r.nextDueDate.getTime() === today.getTime() ? entry.dueToday : entry.overdue).push(r.title);
      byUser.set(userId, entry);
    }
  }
  return byUser;
}

const list = (items: string[]) => (items.length <= 3 ? items.join(", ") : `${items.slice(0, 3).join(", ")} and ${items.length - 3} more`);

/** The one message a person gets. */
export function digestMessage(entry: Digest): PushPayload {
  const parts: string[] = [];
  if (entry.dueToday.length === 1) parts.push(`${entry.dueToday[0]} is due today`);
  else if (entry.dueToday.length > 1) parts.push(`Due today: ${list(entry.dueToday)}`);
  if (entry.overdue.length === 1) parts.push(`${entry.overdue[0]} is 2 days overdue`);
  else if (entry.overdue.length > 1) parts.push(`2 days overdue: ${list(entry.overdue)}`);
  if (entry.vault.length > 0) parts.push(`Vault: ${list(entry.vault)}`);
  const onlyVault = entry.dueToday.length === 0 && entry.overdue.length === 0;
  return { title: "Nest", body: parts.join(" · "), url: onlyVault ? "/vault" : "/tasks" };
}
