import type { PrismaClient } from "@prisma/client";

import { DEFAULT_VAULT_CATEGORIES, FALLBACK_VAULT_CATEGORY } from "@/lib/vault";

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
