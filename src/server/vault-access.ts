import type { PrismaClient } from "@prisma/client";

import { DEFAULT_VAULT_CATEGORIES, FALLBACK_VAULT_CATEGORY, VAULT_EXPIRY_WARNING_DAYS } from "@/lib/vault";

export type VaultCtx = { prisma: PrismaClient; householdId: string; userId: string };

/** Shared, yours, or a housemate's Personal entry they've left visible. */
export const readable = (ctx: Pick<VaultCtx, "householdId" | "userId">) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }, { ownerId: { not: null }, visibleToHousehold: true }],
});

/** Shared, or yours — visibility never grants edit rights. */
export const editable = (ctx: Pick<VaultCtx, "householdId" | "userId">) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }],
});

/** A Household that has none yet (created after the migration) gets the default categories. */
export async function ensureVaultCategories(prisma: PrismaClient, householdId: string) {
  const existing = await prisma.vaultCategory.count({ where: { householdId } });
  if (existing > 0) return;
  await prisma.vaultCategory.createMany({
    data: DEFAULT_VAULT_CATEGORIES.map((name, position) => ({
      householdId,
      name,
      position,
      isFallback: name === FALLBACK_VAULT_CATEGORY,
    })),
    skipDuplicates: true,
  });
}

/** Entries the Member can edit (Shared or their own) that expire within the warning window, soonest first. */
export function expiringEntries(ctx: VaultCtx) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + VAULT_EXPIRY_WARNING_DAYS);
  return ctx.prisma.vaultEntry.findMany({
    where: { ...editable(ctx), expiresOn: { not: null, lte: horizon } },
    orderBy: { expiresOn: "asc" },
    select: { id: true, title: true, expiresOn: true, expiryLabel: true },
  });
}
