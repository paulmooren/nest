import type { PrismaClient } from "@prisma/client";

import { missingStatementsFor } from "@/server/api/routers/dashboard";
import { isModuleEnabled } from "@/lib/modules";
import type { PushPayload } from "@/server/push";

const list = (names: string[]) =>
  names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;

/**
 * Who to tell, on the 1st of the month, that last month's statement is missing (see ADR 0010): each Member with a
 * Financial account they own or share that has no transaction dated last month. The same rule as the Inbox, so a
 * Personal account's missing statement goes to its owner only. Households with Finance switched off are skipped.
 */
export async function buildStatementPushes(prisma: PrismaClient) {
  const members = await prisma.householdMember.findMany({
    select: { userId: true, householdId: true, household: { select: { disabledModules: true } } },
  });

  const byUser = new Map<string, string[]>();
  for (const m of members) {
    if (!isModuleEnabled(m.household.disabledModules, "finance")) continue;
    const missing = await missingStatementsFor({ prisma, householdId: m.householdId, userId: m.userId });
    if (missing.length === 0) continue;
    byUser.set(m.userId, [...(byUser.get(m.userId) ?? []), ...missing.map((s) => s.accountName)]);
  }
  return byUser;
}

/** The message: which accounts are missing last month's statement. Opens Today, where it can be imported. */
export function statementMessage(accountNames: string[]): PushPayload {
  return {
    title: "Nest",
    body:
      accountNames.length === 1
        ? `Last month's statement is missing for ${accountNames[0]}`
        : `Last month's statement is missing for ${list(accountNames)}`,
    url: "/today",
  };
}
