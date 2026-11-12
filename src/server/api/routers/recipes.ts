import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { clientIdSchema, rejectDuplicateId } from "@/server/api/client-id";
import { editableCookbooks, ensureStarterCookbook, readableCookbooks } from "@/server/recipes-access";
import { fetchPublicPage, FetchError } from "@/server/fetch-public-url";
import { deleteFile } from "@/server/vault-storage";
import { parseRecipeHtml } from "@/lib/recipe-import";
import {
  LINK_IMPORTS_PER_HOUR,
  PLANNED_MEAL_NAME_MAX,
  RECIPE_MINUTES_MAX,
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
  totalMinutes: z.number().int().min(1).max(RECIPE_MINUTES_MAX).nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === "" || /^https:\/\//i.test(v), "The photo link must start with https://")
    .nullable(),
});

const dayInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const toDay = (day: string) => new Date(`${day}T00:00:00.000Z`);

const NOT_YOURS = "That Cookbook doesn't exist, or you can't edit it.";

/** Planned meals a Member sees: every typed one, and the ones whose Recipe they can see. */
const visibleMeals = (ctx: { householdId: string; userId: string }) => ({
  OR: [{ recipeId: null }, { recipe: { cookbook: readableCookbooks(ctx) } }],
});

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
        const photos = await ctx.prisma.recipe.findMany({
          where: { cookbookId: cookbook.id, photoKey: { not: null } },
          select: { photoKey: true },
        });
        await ctx.prisma.cookbook.delete({ where: { id: cookbook.id } });
        await Promise.all(photos.map((p) => deleteFile(p.photoKey!)));
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
        select: {
          id: true,
          cookbookId: true,
          name: true,
          ingredients: true,
          servings: true,
          totalMinutes: true,
          imageUrl: true,
          photoKey: true,
          cookedCount: true,
          lastCookedAt: true,
          createdAt: true,
          updatedAt: true,
        },
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
        data: { id, ...data, sourceUrl: data.sourceUrl || null, imageUrl: data.imageUrl || null },
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
        data: { ...data, sourceUrl: data.sourceUrl || null, imageUrl: data.imageUrl || null, updatedAt: now },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Someone else changed this Recipe since you opened it." });
      }
      return { id, updatedAt: now };
    }),

  /**
   * Reads the recipe on a web page into a draft for the editor. Nothing is saved. A page with no recipe data, or one
   * that can't be fetched, is a BAD_REQUEST with a message fit to show.
   */
  importFromUrl: householdProcedure
    .input(z.object({ url: z.string().trim().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      // Every attempt counts, whether or not the page turns out to hold a recipe: the cap is on what this server
      // is made to fetch, not on what the Member gets out of it.
      const hourAgo = new Date(Date.now() - 3_600_000);
      const recent = await ctx.prisma.linkImport.count({ where: { userId: ctx.userId, createdAt: { gte: hourAgo } } });
      if (recent >= LINK_IMPORTS_PER_HOUR) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You've imported a lot of links in the last hour. Try again later, or type the recipe in.",
        });
      }
      await ctx.prisma.linkImport.create({ data: { userId: ctx.userId } });
      // Yesterday's attempts are of no use to anyone; clearing them here saves a scheduled job.
      await ctx.prisma.linkImport.deleteMany({ where: { userId: ctx.userId, createdAt: { lt: new Date(Date.now() - 86_400_000) } } });

      let html: string;
      try {
        html = await fetchPublicPage(input.url);
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: e instanceof FetchError ? e.message : "Couldn't reach that page." });
      }
      const recipe = parseRecipeHtml(html);
      if (!recipe) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That page doesn't share its recipe in a way Nest can read. Type it in instead; the link stays.",
        });
      }
      return {
        name: recipe.name.slice(0, RECIPE_NAME_MAX),
        servings: recipe.servings,
        ingredients: recipe.ingredients.join("\n").slice(0, RECIPE_INGREDIENTS_MAX),
        steps: recipe.steps.join("\n").slice(0, RECIPE_STEPS_MAX),
        totalMinutes: recipe.totalMinutes,
        imageUrl: recipe.imageUrl,
      };
    }),

  /**
   * Records that a Recipe was cooked: one more time, last cooked now. Anyone who can see the Recipe may. It leaves
   * the edit time alone, so it never trips the edit-conflict check of an open editor.
   */
  markCooked: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.$executeRaw`
      UPDATE "recipes" SET "cookedCount" = "cookedCount" + 1, "lastCookedAt" = NOW()
      WHERE "id" = ${input.id}
        AND "cookbookId" IN (
          SELECT "id" FROM "cookbooks"
          WHERE "householdId" = ${ctx.householdId}
            AND ("ownerId" IS NULL OR "ownerId" = ${ctx.userId} OR "visibleToHousehold" = true)
        )`;
    if (result === 0) throw new TRPCError({ code: "NOT_FOUND" });
    return { success: true };
  }),

  /**
   * Puts Ingredient lines on a Shopping list the Member can use, each as one Shopping item. Lines already open on
   * that list (same name, whatever the capitals) are skipped.
   */
  addToShopping: householdProcedure
    .input(z.object({ listId: z.string(), lines: z.array(z.string().trim().min(1).max(300)).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.prisma.shoppingList.findFirst({
        where: { id: input.listId, householdId: ctx.householdId, OR: [{ ownerId: null }, { ownerId: ctx.userId }] },
        select: { id: true, name: true },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });
      const open = await ctx.prisma.shoppingItem.findMany({
        where: { listId: list.id, clearedAt: null, checkedAt: null },
        select: { name: true },
      });
      const seen = new Set(open.map((i) => i.name.toLowerCase()));
      const names: string[] = [];
      for (const line of input.lines) {
        const name = line.slice(0, 120);
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        names.push(name);
      }
      if (names.length > 0) {
        const now = Date.now();
        await ctx.prisma.shoppingItem.createMany({
          // Spaced a millisecond apart so the list keeps the Recipe's order.
          data: names.map((name, i) => ({ listId: list.id, name, addedById: ctx.userId, createdAt: new Date(now + i) })),
        });
      }
      return { added: names.length, skipped: input.lines.length - names.length, listName: list.name };
    }),

  // ── Meal plan ───────────────────────────────────────────────────────────
  /**
   * The Planned meals from `from` for `days` days, oldest first. One with a Recipe carries what is needed to show
   * and shop for it; one that was only typed carries its name.
   */
  plan: householdProcedure
    .input(z.object({ from: dayInput, days: z.number().int().min(1).max(31) }))
    .query(async ({ ctx, input }) => {
      const from = toDay(input.from);
      const to = new Date(from.getTime() + input.days * 86_400_000);
      const meals = await ctx.prisma.plannedMeal.findMany({
        where: { householdId: ctx.householdId, day: { gte: from, lt: to }, ...visibleMeals(ctx) },
        orderBy: [{ day: "asc" }, { createdAt: "asc" }],
        select: { id: true, day: true, name: true, recipe: { select: { id: true, name: true, ingredients: true } } },
      });
      return meals.map((m) => ({
        id: m.id,
        day: m.day.toISOString().slice(0, 10),
        // What the meal is called, whichever kind it is.
        name: m.recipe?.name ?? m.name ?? "",
        recipe: m.recipe,
      }));
    }),

  /** Puts a meal on a day: a Recipe the Member can see, or a name typed for a meal that is not a Recipe. */
  planMeal: householdProcedure
    .input(
      z.union([
        z.object({ day: dayInput, recipeId: z.string() }),
        z.object({ day: dayInput, name: z.string().trim().min(1).max(PLANNED_MEAL_NAME_MAX) }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const day = toDay(input.day);
      if ("name" in input) {
        return ctx.prisma.plannedMeal.create({ data: { householdId: ctx.householdId, name: input.name, day }, select: { id: true } });
      }
      const recipe = await ctx.prisma.recipe.findFirst({
        where: { id: input.recipeId, cookbook: readableCookbooks(ctx) },
        select: { id: true },
      });
      if (!recipe) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = await ctx.prisma.plannedMeal.findFirst({
        where: { householdId: ctx.householdId, recipeId: recipe.id, day },
        select: { id: true },
      });
      if (existing) return existing;
      return ctx.prisma.plannedMeal.create({
        data: { householdId: ctx.householdId, recipeId: recipe.id, day },
        select: { id: true },
      });
    }),

  unplanMeal: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.plannedMeal.deleteMany({
      where: { id: input.id, householdId: ctx.householdId, ...visibleMeals(ctx) },
    });
    if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
    return { success: true };
  }),

  delete: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const recipe = await ctx.prisma.recipe.findFirst({
      where: { id: input.id, cookbook: editableCookbooks(ctx) },
      select: { id: true, photoKey: true },
    });
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.prisma.recipe.delete({ where: { id: recipe.id } });
    if (recipe.photoKey) await deleteFile(recipe.photoKey);
    return { success: true };
  }),

  /** Takes the Member's own photo off a Recipe; a photo from the import, if any, shows again. */
  removePhoto: householdProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const recipe = await ctx.prisma.recipe.findFirst({
      where: { id: input.id, cookbook: editableCookbooks(ctx) },
      select: { id: true, photoKey: true },
    });
    if (!recipe) throw new TRPCError({ code: "NOT_FOUND" });
    if (recipe.photoKey) {
      await ctx.prisma.$executeRaw`UPDATE "recipes" SET "photoKey" = NULL WHERE "id" = ${recipe.id}`;
      await deleteFile(recipe.photoKey);
    }
    return { success: true };
  }),
});
