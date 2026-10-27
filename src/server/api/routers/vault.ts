import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { clientIdSchema, rejectDuplicateId } from "@/server/api/client-id";
import { decryptValue, encryptValue } from "@/server/vault-crypto";
import { deleteFile } from "@/server/vault-storage";
import { editable, ensureVaultCategories, readable, type VaultCtx } from "@/server/vault-access";
import { VAULT_EXPIRY_WARNING_DAYS, VAULT_FIELD_KINDS, type VaultField } from "@/lib/vault";

type Stored = VaultField; // secret values are ciphertext here

const fieldInput = z.object({
  label: z.string().trim().min(1).max(60),
  kind: z.enum(VAULT_FIELD_KINDS),
  value: z.string().min(1).max(500),
});

const entryInput = z.object({
  title: z.string().trim().min(1).max(100),
  categoryId: z.string(),
  expiresOn: z.coerce.date().nullable().optional(),
  expiryLabel: z.string().trim().max(40).nullable().optional(),
  fields: z.array(fieldInput).max(20),
  note: z.string().max(2000).nullable().optional(),
});

const encryptFields = (fields: z.infer<typeof fieldInput>[], householdId: string): Stored[] =>
  fields.map((f) => ({ ...f, value: f.kind === "secret" ? encryptValue(f.value, householdId) : f.value }));

/** The category must be this Household's own. */
async function requireCategory(ctx: VaultCtx, categoryId: string) {
  const found = await ctx.prisma.vaultCategory.findFirst({
    where: { id: categoryId, householdId: ctx.householdId },
    select: { id: true },
  });
  if (!found) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown category." });
}

type EntryRow = {
  id: string;
  title: string;
  categoryId: string;
  expiresOn: Date | null;
  expiryLabel: string | null;
  ownerId: string | null;
  visibleToHousehold: boolean;
  pinned: boolean;
  fields: unknown;
  noteEnc: string | null;
  updatedAt: Date;
  _count: { attachments: number };
};

/** What the list and detail screens show: Text and Date Fields plainly, Secrets by label only. Never a secret value. */
function toPublic(e: EntryRow) {
  const fields = e.fields as Stored[];
  return {
    id: e.id,
    title: e.title,
    categoryId: e.categoryId,
    expiresOn: e.expiresOn,
    expiryLabel: e.expiryLabel,
    ownerId: e.ownerId,
    visibleToHousehold: e.visibleToHousehold,
    pinned: e.pinned,
    plainFields: fields.filter((f) => f.kind !== "secret").map((f) => ({ label: f.label, kind: f.kind, value: f.value })),
    secretLabels: fields.filter((f) => f.kind === "secret").map((f) => f.label),
    hasNote: e.noteEnc !== null,
    attachmentCount: e._count.attachments,
    updatedAt: e.updatedAt,
  };
}

const withCount = { _count: { select: { attachments: true } } } as const;

export const vaultRouter = createTRPCRouter({
  // ── Vault categories ────────────────────────────────────────────────────
  listCategories: householdProcedure.query(async ({ ctx }) => {
    await ensureVaultCategories(ctx.prisma, ctx.householdId);
    return ctx.prisma.vaultCategory.findMany({
      where: { householdId: ctx.householdId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, position: true, isFallback: true },
    });
  }),

  createCategory: householdProcedure
    .input(z.object({ id: clientIdSchema, name: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.prisma.vaultCategory.aggregate({
        where: { householdId: ctx.householdId },
        _max: { position: true },
      });
      try {
        return await rejectDuplicateId(() =>
          ctx.prisma.vaultCategory.create({
            data: {
              id: input.id,
              householdId: ctx.householdId,
              name: input.name,
              position: (last._max.position ?? -1) + 1,
            },
            select: { id: true },
          }),
        );
      } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
          throw new TRPCError({ code: "CONFLICT", message: "You already have a category with this name." });
        }
        throw error;
      }
    }),

  renameCategory: householdProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.prisma.vaultCategory.updateMany({
          where: { id: input.id, householdId: ctx.householdId },
          data: { name: input.name },
        });
        if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
        return { success: true };
      } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
          throw new TRPCError({ code: "CONFLICT", message: "You already have a category with this name." });
        }
        throw error;
      }
    }),

  /** Deleting a category moves its Entries (yours and everyone's) to "Other", which can't be deleted. */
  deleteCategory: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const category = await ctx.prisma.vaultCategory.findFirst({ where: { id: input.id, householdId: ctx.householdId } });
    if (!category) throw new TRPCError({ code: "NOT_FOUND" });
    if (category.isFallback) throw new TRPCError({ code: "BAD_REQUEST", message: '"Other" can\'t be deleted.' });
    const fallback = await ctx.prisma.vaultCategory.findFirst({
      where: { householdId: ctx.householdId, isFallback: true },
      select: { id: true },
    });
    if (!fallback) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No fallback category." });
    await ctx.prisma.$transaction([
      ctx.prisma.vaultEntry.updateMany({ where: { categoryId: category.id }, data: { categoryId: fallback.id } }),
      ctx.prisma.vaultCategory.delete({ where: { id: category.id } }),
    ]);
    return { success: true };
  }),

  reorderCategories: householdProcedure
    .input(z.object({ ids: z.array(z.string()).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.ids.map((id, position) =>
          ctx.prisma.vaultCategory.updateMany({ where: { id, householdId: ctx.householdId }, data: { position } }),
        ),
      );
      return { success: true };
    }),

  // ── Entries ─────────────────────────────────────────────────────────────
  /** Entries you can see. Never includes secret values or notes — those only come from `reveal`. */
  list: householdProcedure.query(async ({ ctx }) => {
    const entries = await ctx.prisma.vaultEntry.findMany({
      where: readable(ctx),
      orderBy: { title: "asc" },
      include: withCount,
    });
    return entries.map(toPublic);
  }),

  get: householdProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const entry = await ctx.prisma.vaultEntry.findFirst({
      where: { id: input.id, ...readable(ctx) },
      include: { ...withCount, attachments: { orderBy: { createdAt: "asc" } } },
    });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      ...toPublic(entry),
      attachments: entry.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        contentType: a.contentType,
        size: a.size,
      })),
    };
  }),

  /** Decrypts one entry's secrets and note on demand. A mutation so the plaintext is never cached by the client. */
  reveal: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const entry = await ctx.prisma.vaultEntry.findFirst({ where: { id: input.id, ...readable(ctx) } });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: entry.id,
      // Every Field in order, so the edit form can start from one list.
      fields: (entry.fields as Stored[]).map((f) => ({
        label: f.label,
        kind: f.kind,
        value: f.kind === "secret" ? decryptValue(f.value, ctx.householdId) : f.value,
      })),
      note: entry.noteEnc ? decryptValue(entry.noteEnc, ctx.householdId) : null,
    };
  }),

  create: householdProcedure
    .input(entryInput.extend({ id: clientIdSchema, shared: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await requireCategory(ctx, input.categoryId);
      return rejectDuplicateId(() =>
        ctx.prisma.vaultEntry.create({
          data: {
            id: input.id,
            householdId: ctx.householdId,
            ownerId: input.shared ? null : ctx.userId,
            title: input.title,
            categoryId: input.categoryId,
            expiresOn: input.expiresOn ?? null,
            expiryLabel: input.expiresOn ? input.expiryLabel || null : null,
            fields: encryptFields(input.fields, ctx.householdId),
            noteEnc: input.note ? encryptValue(input.note, ctx.householdId) : null,
          },
          select: { id: true },
        }),
      );
    }),

  update: householdProcedure.input(entryInput.extend({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.vaultEntry.findFirst({
      where: { id: input.id, ...editable(ctx) },
      select: { id: true },
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    await requireCategory(ctx, input.categoryId);
    return ctx.prisma.vaultEntry.update({
      where: { id: input.id },
      data: {
        title: input.title,
        categoryId: input.categoryId,
        expiresOn: input.expiresOn ?? null,
        expiryLabel: input.expiresOn ? input.expiryLabel || null : null,
        fields: encryptFields(input.fields, ctx.householdId),
        noteEnc: input.note ? encryptValue(input.note, ctx.householdId) : null,
      },
      select: { id: true },
    });
  }),

  /** Show or hide one of your Personal entries from the household. Shared entries are always visible. */
  setVisibility: householdProcedure
    .input(z.object({ id: z.string(), visible: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.vaultEntry.updateMany({
        where: { id: input.id, householdId: ctx.householdId, ownerId: ctx.userId },
        data: { visibleToHousehold: input.visible },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  setPinned: householdProcedure
    .input(z.object({ id: z.string(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.vaultEntry.updateMany({
        where: { id: input.id, ...editable(ctx) },
        data: { pinned: input.pinned },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  delete: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const entry = await ctx.prisma.vaultEntry.findFirst({
      where: { id: input.id, ...editable(ctx) },
      select: { id: true, attachments: { select: { storageKey: true } } },
    });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.prisma.vaultEntry.delete({ where: { id: entry.id } });
    await Promise.all(entry.attachments.map((a) => deleteFile(a.storageKey)));
    return { success: true };
  }),

  removeAttachment: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const attachment = await ctx.prisma.vaultAttachment.findFirst({
      where: { id: input.id, entry: editable(ctx) },
      select: { id: true, storageKey: true },
    });
    if (!attachment) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.prisma.vaultAttachment.delete({ where: { id: attachment.id } });
    await deleteFile(attachment.storageKey);
    return { success: true };
  }),

  /**
   * Dates for the dashboard: only Shared entries and your own (never a housemate's Personal one), already past or
   * within the warning window. Titles and dates only — never values.
   */
  expiringSoon: householdProcedure.query(async ({ ctx }) => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + VAULT_EXPIRY_WARNING_DAYS);
    return ctx.prisma.vaultEntry.findMany({
      where: { ...editable(ctx), expiresOn: { not: null, lte: horizon } },
      orderBy: { expiresOn: "asc" },
      select: { id: true, title: true, expiresOn: true, expiryLabel: true },
    });
  }),
});
