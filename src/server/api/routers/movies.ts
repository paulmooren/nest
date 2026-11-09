import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { clientIdSchema, rejectDuplicateId } from "@/server/api/client-id";
import { editableWatchlists, ensureStarterWatchlist, readableWatchlists } from "@/server/movies-access";
import { searchTmdb, tmdbAvailable, tmdbDetails } from "@/server/tmdb";
import { RATING_NOTE_MAX, TITLE_NAME_MAX } from "@/lib/movies";

const kind = z.enum(["MOVIE", "SERIES"]);
const status = z.enum(["WANT", "WATCHING", "WATCHED"]);
const NOT_YOURS = "That Watchlist doesn't exist, or you can't edit it.";

export const moviesRouter = createTRPCRouter({
  // ── Watchlists ──────────────────────────────────────────────────────────
  /** Watchlists you can see, the starter first, with how many Titles each holds. */
  listWatchlists: householdProcedure.query(async ({ ctx }) => {
    await ensureStarterWatchlist(ctx.prisma, ctx);
    const rows = await ctx.prisma.watchlist.findMany({
      where: readableWatchlists(ctx),
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, ownerId: true, visibleToHousehold: true, isStarter: true, _count: { select: { titles: true } } },
    });
    return rows.map(({ _count, ...w }) => ({ ...w, titleCount: _count.titles })).sort((a, b) => Number(b.isStarter) - Number(a.isStarter));
  }),

  createWatchlist: householdProcedure
    .input(z.object({ id: clientIdSchema, name: z.string().trim().min(1).max(60), shared: z.boolean() }))
    .mutation(({ ctx, input }) =>
      rejectDuplicateId(() =>
        ctx.prisma.watchlist.create({
          data: { id: input.id, householdId: ctx.householdId, ownerId: input.shared ? null : ctx.userId, name: input.name },
          select: { id: true },
        }),
      ),
    ),

  renameWatchlist: householdProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.watchlist.updateMany({
        where: { id: input.id, isStarter: false, ...editableWatchlists(ctx) },
        data: { name: input.name },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /** Show or hide one of your Personal Watchlists from the household. Shared Watchlists are always visible. */
  setWatchlistVisibility: householdProcedure
    .input(z.object({ id: z.string(), visible: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.watchlist.updateMany({
        where: { id: input.id, householdId: ctx.householdId, ownerId: ctx.userId },
        data: { visibleToHousehold: input.visible },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /** Deletes a Watchlist. Its Titles move to `moveTo` (a Watchlist you can edit) or are deleted with it. */
  deleteWatchlist: householdProcedure
    .input(z.object({ id: z.string(), moveTo: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const watchlist = await ctx.prisma.watchlist.findFirst({
        where: { id: input.id, ...editableWatchlists(ctx) },
        select: { id: true, isStarter: true },
      });
      if (!watchlist) throw new TRPCError({ code: "NOT_FOUND" });
      if (watchlist.isStarter) throw new TRPCError({ code: "BAD_REQUEST", message: 'The "Watchlist" can\'t be deleted.' });
      if (input.moveTo !== null) {
        const target =
          input.moveTo === watchlist.id
            ? null
            : await ctx.prisma.watchlist.findFirst({ where: { id: input.moveTo, ...editableWatchlists(ctx) }, select: { id: true } });
        if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
        await ctx.prisma.$transaction([
          ctx.prisma.title.updateMany({ where: { watchlistId: watchlist.id }, data: { watchlistId: target.id } }),
          ctx.prisma.watchlist.delete({ where: { id: watchlist.id } }),
        ]);
      } else {
        await ctx.prisma.watchlist.delete({ where: { id: watchlist.id } });
      }
      return { success: true };
    }),

  // ── Titles ──────────────────────────────────────────────────────────────
  /** Every Title you can see, newest first, each with every Member's rating. */
  list: householdProcedure.query(({ ctx }) =>
    ctx.prisma.title.findMany({
      where: { watchlist: readableWatchlists(ctx) },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        watchlistId: true,
        name: true,
        kind: true,
        status: true,
        year: true,
        runtimeMinutes: true,
        overview: true,
        posterUrl: true,
        tmdbId: true,
        watchedAt: true,
        createdAt: true,
        ratings: { select: { userId: true, halfStars: true, note: true } },
      },
    }),
  ),

  /** Whether films and series can be looked up, and what matches the words typed. */
  search: householdProcedure.input(z.object({ query: z.string().trim().min(2).max(100) })).query(async ({ input }) => {
    if (!tmdbAvailable()) return { available: false as const, hits: [] };
    try {
      return { available: true as const, hits: await searchTmdb(input.query) };
    } catch {
      // TMDB is down or the key is wrong: typing the Title in by hand still works.
      return { available: false as const, hits: [] };
    }
  }),

  /**
   * Adds a Title. With `tmdbId` its year, running time, overview and poster are fetched and kept, so the list never
   * depends on TMDB afterwards; without, it is just the name, kind and year typed.
   */
  create: householdProcedure
    .input(
      z.object({
        id: clientIdSchema,
        watchlistId: z.string(),
        name: z.string().trim().min(1).max(TITLE_NAME_MAX),
        kind,
        year: z.number().int().min(1870).max(2200).nullable().optional(),
        tmdbId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const watchlist = await ctx.prisma.watchlist.findFirst({
        where: { id: input.watchlistId, ...editableWatchlists(ctx) },
        select: { id: true },
      });
      if (!watchlist) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
      let found: Awaited<ReturnType<typeof tmdbDetails>> | null = null;
      if (input.tmdbId && tmdbAvailable()) found = await tmdbDetails(input.tmdbId, input.kind).catch(() => null);
      return rejectDuplicateId(() =>
        ctx.prisma.title.create({
          data: {
            id: input.id,
            watchlistId: watchlist.id,
            name: (found?.name || input.name).slice(0, TITLE_NAME_MAX),
            kind: input.kind,
            year: found?.year ?? input.year ?? null,
            runtimeMinutes: found?.runtimeMinutes ?? null,
            overview: found?.overview?.slice(0, 2000) ?? null,
            posterUrl: found?.posterUrl ?? null,
            tmdbId: found ? found.tmdbId : null,
          },
          select: { id: true },
        }),
      );
    }),

  /** Change a Title's name, kind, year or Watchlist. */
  update: householdProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1).max(TITLE_NAME_MAX).optional(),
        kind: kind.optional(),
        year: z.number().int().min(1870).max(2200).nullable().optional(),
        watchlistId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.watchlistId) {
        const target = await ctx.prisma.watchlist.findFirst({ where: { id: data.watchlistId, ...editableWatchlists(ctx) }, select: { id: true } });
        if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
      }
      const result = await ctx.prisma.title.updateMany({ where: { id, watchlist: editableWatchlists(ctx) }, data });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /** Want to watch, Watching or Watched. Becoming Watched records today as the date; leaving it clears the date. */
  setStatus: householdProcedure.input(z.object({ id: z.string(), status })).mutation(async ({ ctx, input }) => {
    const title = await ctx.prisma.title.findFirst({
      where: { id: input.id, watchlist: editableWatchlists(ctx) },
      select: { id: true, status: true, watchedAt: true },
    });
    if (!title) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.prisma.title.update({
      where: { id: title.id },
      data: { status: input.status, watchedAt: input.status === "WATCHED" ? (title.watchedAt ?? new Date()) : null },
    });
    return { success: true };
  }),

  /**
   * Your own rating of a Title you can see: half stars 1–10 (or none) and a short note. Rating never needs edit
   * rights — it is yours, not the Watchlist owner's.
   */
  rate: householdProcedure
    .input(z.object({ titleId: z.string(), halfStars: z.number().int().min(1).max(10).nullable(), note: z.string().trim().max(RATING_NOTE_MAX) }))
    .mutation(async ({ ctx, input }) => {
      const title = await ctx.prisma.title.findFirst({ where: { id: input.titleId, watchlist: readableWatchlists(ctx) }, select: { id: true } });
      if (!title) throw new TRPCError({ code: "NOT_FOUND" });
      const where = { titleId_userId: { titleId: title.id, userId: ctx.userId } };
      if (input.halfStars === null && !input.note) {
        await ctx.prisma.titleRating.deleteMany({ where: { titleId: title.id, userId: ctx.userId } });
      } else {
        const data = { halfStars: input.halfStars, note: input.note || null };
        await ctx.prisma.titleRating.upsert({ where, update: data, create: { titleId: title.id, userId: ctx.userId, ...data } });
      }
      return { success: true };
    }),

  delete: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.title.deleteMany({ where: { id: input.id, watchlist: editableWatchlists(ctx) } });
    if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
    return { success: true };
  }),
});
