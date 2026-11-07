import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { clientIdSchema, rejectDuplicateId } from "@/server/api/client-id";
import { editableCookbooks, ensureStarterCookbook, readableCookbooks } from "@/server/recipes-access";
import {
  ingredientsExcerpt,
  RECIPE_INGREDIENTS_MAX,
  RECIPE_NAME_MAX,
  RECIPE_SERVINGS_MAX,
  RECIPE_STEPS_MAX,
} from "@/lib/recipes";

const recipeInput = z.object({
  cookbookId: z.string(),
  name: z.string().trim().min(1).max(RECIPE_NAME_MAX),
  ingredients: z.string().max(RECIPE_INGREDIENTS_MAX),
  steps: z.string().max(RECIPE_STEPS_MAX),
  servings: z.number().int().min(1).max(RECIPE_SERVINGS_MAX).nullable(),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "The link must start with http:// or https://")
    .nullable(),
});

const NOT_YOURS = "That Cookbook doesn't exist, or you can't edit it.";

export const recipesRouter = createTRPCRouter({
  // ── Cookbooks ───────────────────────────────────────────────────────────
  /** Cookbooks you can see, the starter first, with how many Recipes each holds. */
  listCookbooks: householdProcedure.query(async ({ ctx }) => {
    await ensureStarterCookbook(ctx.prisma, ctx);
    const rows = await ctx.prisma.cookbook.findMany({
      where: readableCookbooks(ctx),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        ownerId: true,
        visibleToHousehold: true,
        isStarter: true,
        _count: { select: { recipes: true } },
      },
    });
    return rows
      .map(({ _count, ...c }) => ({ ...c, recipeCount: _count.recipes }))
      .sort((a, b) => Number(b.isStarter) - Number(a.isStarter));
  }),

  createCookbook: householdProcedure
    .input(z.object({ id: clientIdSchema, name: z.string().trim().min(1).max(60), shared: z.boolean() }))
    .mutation(({ ctx, input }) =>
      rejectDuplicateId(() =>
        ctx.prisma.cookbook.create({
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

  renameCookbook: householdProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.cookbook.updateMany({
        where: { id: input.id, isStarter: false, ...editableCookbooks(ctx) },
        data: { name: input.name },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /** Show or hide one of your Personal Cookbooks from the household. Shared Cookbooks are always visible. */
  setCookbookVisibility: householdProcedure
    .input(z.object({ id: z.string(), visible: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.cookbook.updateMany({
        where: { id: input.id, householdId: ctx.householdId, ownerId: ctx.userId },
        data: { visibleToHousehold: input.visible },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  /**
   * Deletes a Cookbook. Its Recipes either move to `moveTo` (a Cookbook you can edit) or are deleted with it.
   * The starter "Recipes" Cookbook can't be deleted.
   */
  deleteCookbook: householdProcedure
    .input(z.object({ id: z.string(), moveTo: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const cookbook = await ctx.prisma.cookbook.findFirst({
        where: { id: input.id, ...editableCookbooks(ctx) },
        select: { id: true, isStarter: true },
      });
      if (!cookbook) throw new TRPCError({ code: "NOT_FOUND" });
      if (cookbook.isStarter) {
        throw new TRPCError({ code: "BAD_REQUEST", message: 'The "Recipes" Cookbook can\'t be deleted.' });
      }
      if (input.moveTo !== null) {
        if (input.moveTo === cookbook.id) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
        const target = await ctx.prisma.cookbook.findFirst({
          where: { id: input.moveTo, ...editableCookbooks(ctx) },
          select: { id: true },
        });
        if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
        await ctx.prisma.$transaction([
          ctx.prisma.recipe.updateMany({ where: { cookbookId: cookbook.id }, data: { cookbookId: target.id } }),
          ctx.prisma.cookbook.delete({ where: { id: cookbook.id } }),
        ]);
      } else {
        await ctx.prisma.cookbook.delete({ where: { id: cookbook.id } });
      }
      return { success: true };
    }),

  // ── Recipes ─────────────────────────────────────────────────────────────
  /**
   * Recipes you can see, by name. A search looks in names, Ingredients and steps across every Cookbook you can see.
   * Only a short preview of the Ingredients is sent.
   */
  list: householdProcedure
    .input(z.object({ cookbookId: z.string().optional(), query: z.string().trim().max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const q = input?.query;
      const rows = await ctx.prisma.recipe.findMany({
        where: {
          cookbook: readableCookbooks(ctx),
          ...(input?.cookbookId ? { cookbookId: input.cookbookId } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { ingredients: { contains: q, mode: "insensitive" } },
                  { steps: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, cookbookId: true, name: true, ingredients: true, servings: true, updatedAt: true },
        take: 500,
      });
      return rows.map(({ ingredients, ...r }) => ({ ...r, excerpt: ingredientsExcerpt(ingredients) }));
    }),

  get: householdProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const recipe = await ctx.prisma.recipe.findFirst({
      where: { id: input.id, cookbook: readableCookbooks(ctx) },
      include: { cookbook: { select: { name: true, ownerId: true, visibleToHousehold: true } } },
    });
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND" });
    const { cookbook, ...rest } = recipe;
    return { ...rest, cookbookName: cookbook.name, ownerId: cookbook.ownerId };
  }),

  create: householdProcedure.input(recipeInput.extend({ id: clientIdSchema })).mutation(async ({ ctx, input }) => {
    const cookbook = await ctx.prisma.cookbook.findFirst({
      where: { id: input.cookbookId, ...editableCookbooks(ctx) },
      select: { id: true },
    });
    if (!cookbook) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });
    const { id, ...data } = input;
    return rejectDuplicateId(() =>
      ctx.prisma.recipe.create({
        data: { id, ...data, sourceUrl: data.sourceUrl || null },
        select: { id: true, updatedAt: true },
      }),
    );
  }),

  /**
   * Saves a Recipe. `expectedUpdatedAt` is the edit time the editor opened with: if the Recipe has been saved since
   * (by a housemate, or from another device), nothing is overwritten and the caller gets a CONFLICT.
   */
  update: householdProcedure
    .input(recipeInput.extend({ id: z.string(), expectedUpdatedAt: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recipe.findFirst({
        where: { id: input.id, cookbook: editableCookbooks(ctx) },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const target = await ctx.prisma.cookbook.findFirst({
        where: { id: input.cookbookId, ...editableCookbooks(ctx) },
        select: { id: true },
      });
      if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: NOT_YOURS });

      const { id, expectedUpdatedAt, ...data } = input;
      const now = new Date();
      const result = await ctx.prisma.recipe.updateMany({
        where: { id, updatedAt: expectedUpdatedAt },
        data: { ...data, sourceUrl: data.sourceUrl || null, updatedAt: now },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Someone else changed this Recipe since you opened it." });
      }
      return { id, updatedAt: now };
    }),

  delete: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.recipe.deleteMany({ where: { id: input.id, cookbook: editableCookbooks(ctx) } });
    if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
    return { success: true };
  }),
});
