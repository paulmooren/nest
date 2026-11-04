import type { PrismaClient } from "@prisma/client";

import { statementsDueFor } from "@/server/api/routers/dashboard";
import { isModuleEnabled } from "@/lib/modules";
import { todayInHousehold } from "@/lib/schedule";
import { statementRange } from "@/lib/statement-due";
import type { PushPayload } from "@/server/push";

export type StatementPush = { accountId: string; accountName: string; from: Date; to: Date };

/**
 * Who to tell that a statement is due (ADR 0011): each Member with a Financial account they own or share whose 90
 * days are up and that has not been pushed for yet in this cycle. The same rule as the Inbox, so a Personal
 * account's statement goes to its owner only. Households with Finance switched off are skipped. `cycles` is what to
 * mark as pushed once the messages are sent, so a cycle is pushed once even if the Member waits to import.
 */
export async function buildStatementPushes(prisma: PrismaClient, today = todayInHousehold()) {
  const members = await prisma.householdMember.findMany({
    select: { userId: true, householdId: true, household: { select: { disabledModules: true } } },
  });

  const byUser = new Map<string, StatementPush[]>();
  const cycles = new Map<string, Date>();
  for (const m of members) {
    if (!isModuleEnabled(m.household.disabledModules, "finance")) continue;
    const due = await statementsDueFor({ prisma, householdId: m.householdId, userId: m.userId }, today);
    const fresh = due.filter((s) => s.pushedFor?.getTime() !== s.from.getTime());
    if (fresh.length === 0) continue;
    byUser.set(m.userId, [
      ...(byUser.get(m.userId) ?? []),
      ...fresh.map((s) => ({ accountId: s.accountId, accountName: s.accountName, from: s.from, to: s.to })),
    ]);
    for (const s of fresh) cycles.set(s.accountId, s.from);
  }
  return { byUser, cycles };
}

/** Remember that these accounts have been pushed for their current cycle. */
export async function markStatementsPushed(prisma: PrismaClient, cycles: Map<string, Date>) {
  await prisma.$transaction(
    [...cycles].map(([id, from]) => prisma.financialAccount.update({ where: { id }, data: { statementPushedFor: from } })),
  );
}

/** The message: which accounts need a statement, and for which dates. Opens Today, where it can be imported. */
export function statementMessage(statements: StatementPush[]): PushPayload {
  const line = (s: StatementPush) => `${s.accountName} ${statementRange(s.from, s.to)}`;
  return {
    title: "Nest",
    body: statements.length === 1 ? `Statement needed: ${line(statements[0])}` : `Statements needed: ${statements.map(line).join(", ")}`,
    url: "/today",
  };
}
