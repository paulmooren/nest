import type { PrismaClient } from "@prisma/client";

import { STARTER_NOTEBOOK } from "@/lib/notes";

type Who = { householdId: string; userId: string };

/** Notebooks that are Shared, yours, or a housemate's Personal one they've left visible. */
export const readableNotebooks = (ctx: Who) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }, { ownerId: { not: null }, visibleToHousehold: true }],
});

/** Notebooks that are Shared, or yours — visibility never grants edit rights. */
export const editableNotebooks = (ctx: Who) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }],
});

/** Every Member gets one Personal, hidden "Notes" Notebook; made the first time they open Notes. */
export async function ensureStarterNotebook(prisma: PrismaClient, ctx: Who) {
  const existing = await prisma.notebook.findFirst({
    where: { householdId: ctx.householdId, ownerId: ctx.userId, isStarter: true },
    select: { id: true },
  });
  if (existing) return;
  await prisma.notebook.create({
    data: { householdId: ctx.householdId, ownerId: ctx.userId, isStarter: true, name: STARTER_NOTEBOOK },
  });
}
