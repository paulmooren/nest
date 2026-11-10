import type { PrismaClient } from "@prisma/client";

import { STARTER_MOVIES, STARTER_SERIES } from "@/lib/movies";
import { editableBy, readableBy } from "@/server/ownership";

type Who = { householdId: string; userId: string };

/** Watchlists that are Shared, yours, or a housemate's Personal one they've left visible. */
export const readableWatchlists = readableBy;

/** Watchlists that are Shared, or yours — visibility never grants edit rights. */
export const editableWatchlists = editableBy;

/**
 * Every Household has two Shared starter Watchlists, "Movies" and "Series"; made the first time anyone opens Movies
 * & Series. A Household from before there were two had one starter called "Watchlist": it becomes "Movies", and
 * the Series on it move to the new "Series".
 */
export async function ensureStarterWatchlists(prisma: PrismaClient, ctx: Who) {
  const starters = await prisma.watchlist.findMany({
    where: { householdId: ctx.householdId, isStarter: true },
    select: { id: true, name: true },
  });
  const starter = (name: string) => ({ householdId: ctx.householdId, ownerId: null, isStarter: true, name });
  const has = (name: string) => starters.some((s) => s.name === name);

  if (!has(STARTER_MOVIES)) {
    const legacy = starters.find((s) => s.name !== STARTER_SERIES);
    if (legacy) await prisma.watchlist.update({ where: { id: legacy.id }, data: { name: STARTER_MOVIES } });
    else await prisma.watchlist.create({ data: starter(STARTER_MOVIES) });
    if (legacy && !has(STARTER_SERIES)) {
      const series = await prisma.watchlist.create({ data: starter(STARTER_SERIES), select: { id: true } });
      await prisma.title.updateMany({ where: { watchlistId: legacy.id, kind: "SERIES" }, data: { watchlistId: series.id } });
      return;
    }
  }
  if (!has(STARTER_SERIES)) await prisma.watchlist.create({ data: starter(STARTER_SERIES) });
}
