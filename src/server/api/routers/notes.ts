import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { clientIdSchema, rejectDuplicateId } from "@/server/api/client-id";
import { editableNotebooks, ensureStarterNotebook, readableNotebooks } from "@/server/notes-access";
import { excerpt, NOTE_BODY_MAX, NOTE_TITLE_MAX } from "@/lib/notes";

const noteInput = z.object({
  notebookId: z.string(),
  title: z.string().trim().max(NOTE_TITLE_MAX),
  body: z.string().max(NOTE_BODY_MAX),
});

const NOT_YOURS = "That Notebook doesn't exist, or you can't edit it.";

export const notesRouter = createTRPCRouter({
  // ── Notebooks ───────────────────────────────────────────────────────────
  /** Notebooks you can see, your own first, with how many Notes each holds. */
  listNotebooks: householdProcedure.query(async ({ ctx }) => {
    await ensureStarterNotebook(ctx.prisma, ctx);
    const rows = await ctx.prisma.notebook.findMany({
      where: readableNotebooks(ctx),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        ownerId: true,
        visibleToHousehold: true,
        isStarter: true,
        _count: { select: { notes: true } },
      },
    });
    return rows
      .map(({ _count, ...n }) => ({ ...n, noteCount: _count.notes }))
      .sort((a, b) => Number(b.isStarter && b.ownerId === ctx.userId) - Number(a.isStarter && a.ownerId === ctx.userId));
  }),

  createNotebook: householdProcedure
    .input(z.object({ id: clientIdSchema, name: z.string().trim().min(1).max(60), shared: z.boolean() }))
    .mutation(({ ctx, input }) =>
      rejectDuplicateId(() =>
        ctx.prisma.notebook.create({
          data: {
            id: input.id,
            householdId: ctx.householdId,
            ownerId: input.shared ? null : ctx.userId,
            name: input.name,
          },
          select: { id: true },
        }),
      ),
    ),

  renameNotebook: householdProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notebook.updateMany({
        where: { id: input.id, ...editableNotebooks(ctx) },
        data: { name: input.name },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /** Show or hide one of your Personal Notebooks from the household. Shared Notebooks are always visible. */
  setNotebookVisibility: householdProcedure
    .input(z.object({ id: z.string(), visible: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notebook.updateMany({
        where: { id: input.id, householdId: ctx.householdId, ownerId: ctx.userId },
        data: { visibleToHousehold: input.visible },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /** Deletes a Notebook and every Note in it. The starter "Notes" Notebook can't be deleted. */
  deleteNotebook: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const notebook = await ctx.prisma.notebook.findFirst({
      where: { id: input.id, ...editableNotebooks(ctx) },
      select: { id: true, isStarter: true },
    });
    if (!notebook) throw new TRPCError({ code: "NOT_FOUND" });
    if (notebook.isStarter) throw new TRPCError({ code: "BAD_REQUEST", message: 'The "Notes" Notebook can\'t be deleted.' });
    await ctx.prisma.notebook.delete({ where: { id: notebook.id } });
    return { success: true };
  }),

  // ── Notes ───────────────────────────────────────────────────────────────
  /**
   * Notes you can see, Pinned first then last edited, newest first. A search looks in titles and bodies across
   * every Notebook you can see. The body itself is not sent — only a short preview.
   */
  list: householdProcedure
    .input(z.object({ notebookId: z.string().optional(), query: z.string().trim().max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const q = input?.query;
      const rows = await ctx.prisma.note.findMany({
        where: {
          notebook: readableNotebooks(ctx),
          ...(input?.notebookId ? { notebookId: input.notebookId } : {}),
          ...(q
            ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] }
            : {}),
        },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        select: { id: true, notebookId: true, title: true, body: true, pinned: true, createdAt: true, updatedAt: true },
        take: 500,
      });
      return rows.map(({ body, ...n }) => ({ ...n, excerpt: excerpt(body) }));
    }),

  get: householdProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const note = await ctx.prisma.note.findFirst({
      where: { id: input.id, notebook: readableNotebooks(ctx) },
      include: { notebook: { select: { name: true, ownerId: true, visibleToHousehold: true } } },
    });
    if (!note) throw new TRPCError({ code: "NOT_FOUND" });
    const { notebook, ...rest } = note;
    return { ...rest, notebookName: notebook.name, ownerId: notebook.ownerId };
  }),

  create: householdProcedure.input(noteInput.extend({ id: clientIdSchema })).mutation(async ({ ctx, input }) => {
    const notebook = await ctx.prisma.notebook.findFirst({
      where: { id: input.notebookId, ...editableNotebooks(ctx) },
      select: { id: true },
    });
    if (!notebook) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
    return rejectDuplicateId(() =>
      ctx.prisma.note.create({
        data: { id: input.id, notebookId: input.notebookId, title: input.title, body: input.body },
        select: { id: true, updatedAt: true },
      }),
    );
  }),

  /**
   * Saves a Note. `expectedUpdatedAt` is the edit time the editor opened with: if the Note has been saved since
   * (by a housemate, or from another device), nothing is overwritten and the caller gets a CONFLICT.
   */
  update: householdProcedure
    .input(noteInput.extend({ id: z.string(), expectedUpdatedAt: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.note.findFirst({
        where: { id: input.id, notebook: editableNotebooks(ctx) },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const target = await ctx.prisma.notebook.findFirst({
        where: { id: input.notebookId, ...editableNotebooks(ctx) },
        select: { id: true },
      });
      if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });

      const now = new Date();
      const result = await ctx.prisma.note.updateMany({
        where: { id: input.id, updatedAt: input.expectedUpdatedAt },
        data: { title: input.title, body: input.body, notebookId: input.notebookId, updatedAt: now },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Someone else changed this Note since you opened it." });
      }
      return { id: input.id, updatedAt: now };
    }),

  setPinned: householdProcedure
    .input(z.object({ id: z.string(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Pinning is arrangement, not editing: it leaves the edit time (and so the sort and any open editor) alone.
      const result = await ctx.prisma.$executeRaw`
        UPDATE "notes" SET "pinned" = ${input.pinned}
        WHERE "id" = ${input.id}
          AND "notebookId" IN (
            SELECT "id" FROM "notebooks"
            WHERE "householdId" = ${ctx.householdId} AND ("ownerId" IS NULL OR "ownerId" = ${ctx.userId})
          )`;
      if (result === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  delete: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.note.deleteMany({ where: { id: input.id, notebook: editableNotebooks(ctx) } });
    if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
    return { success: true };
  }),
});
