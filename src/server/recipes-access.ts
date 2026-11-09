import type { PrismaClient } from "@prisma/client";

import { STARTER_COOKBOOK } from "@/lib/recipes";

type Who = { householdId: string; userId: string };

/** Cookbooks that are Shared, yours, or a housemate's Personal one they've left visible. */
export const readableCookbooks = (ctx: Who) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }, { ownerId: { not: null }, visibleToHousehold: true }],
});

/** Cookbooks that are Shared, or yours — visibility never grants edit rights. */
export const editableCookbooks = (ctx: Who) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }],
});

/** Every Household has one Shared "Recipes" Cookbook; made the first time anyone opens Recipes. */
export async function ensureStarterCookbook(prisma: PrismaClient, ctx: Who) {
  const existing = await prisma.cookbook.findFirst({
    where: { householdId: ctx.householdId, isStarter: true },
    select: { id: true },
  });
  if (existing) return;
  await prisma.cookbook.create({
    data: { householdId: ctx.householdId, ownerId: null, isStarter: true, name: STARTER_COOKBOOK },
  });
}
