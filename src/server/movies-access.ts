import type { PrismaClient } from "@prisma/client";

import { STARTER_WATCHLIST } from "@/lib/movies";
import { editableBy, readableBy } from "@/server/ownership";

type Who = { householdId: string; userId: string };

/** Watchlists that are Shared, yours, or a housemate's Personal one they've left visible. */
export const readableWatchlists = readableBy;

/** Watchlists that are Shared, or yours — visibility never grants edit rights. */
export const editableWatchlists = editableBy;

/** Every Household has one Shared "Watchlist"; made the first time anyone opens Movies & Series. */
export async function ensureStarterWatchlist(prisma: PrismaClient, ctx: Who) {
  const existing = await prisma.watchlist.findFirst({
    where: { householdId: ctx.householdId, isStarter: true },
    select: { id: true },
  });
  if (existing) return;
  await prisma.watchlist.create({
    data: { householdId: ctx.householdId, ownerId: null, isStarter: true, name: STARTER_WATCHLIST },
  });
}
