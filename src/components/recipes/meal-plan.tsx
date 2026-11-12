"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBasketIcon, XIcon } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { showToast } from "@/components/toast";
import { AddToShoppingSheet } from "@/components/recipes/shopping-sheet";
import { SECTION_HEADING } from "@/components/recipes/recipes-ui";
import { useRefreshRecipes, useToday } from "@/components/recipes/use-recipes";
import { dayLabel, parseIngredients, PLANNED_MEAL_NAME_MAX, upcomingDays } from "@/lib/recipes";
import { cn } from "@/lib/utils";

type Meal = inferRouterOutputs<AppRouter>["recipes"]["plan"][number];
const PLAN_DAYS = 7;

/**
 * The Meal plan for the next seven days, as a strip of days to tap. Tapping a day shows what is planned and lets
 * a Recipe be added; "Shop for the plan" puts the Ingredients of everything planned on a Shopping list.
 */
export function MealPlan({ recipes, canShop }: { recipes: { id: string; name: string }[]; canShop: boolean }) {
  const today = useToday();
  const { data: meals } = trpc.recipes.plan.useQuery({ from: today ?? "", days: PLAN_DAYS }, { enabled: !!today });
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [shopping, setShopping] = useState(false);

  if (!today) return null;
  const days = upcomingDays(today, PLAN_DAYS);
  const byDay = new Map<string, Meal[]>();
  for (const meal of meals ?? []) byDay.set(meal.day, [...(byDay.get(meal.day) ?? []), meal]);

  // Only meals that are Recipes have Ingredients to shop for.
  const toShop = (meals ?? []).flatMap((m) => (m.recipe ? [{ day: m.day, recipe: m.recipe }] : []));

  return (
    <section aria-label="Meal plan" className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className={SECTION_HEADING}>Meal plan</h2>
        {canShop && toShop.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShopping(true)}>
            <ShoppingBasketIcon /> Shop for the plan
          </Button>
        )}
      </div>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
        {days.map((day) => {
          const planned = byDay.get(day) ?? [];
          return (
            <li key={day} className="w-32 shrink-0 md:w-auto">
              <button
                type="button"
                onClick={() => setOpenDay(day)}
                aria-label={`${dayLabel(day, today)}: ${planned.length === 0 ? "nothing planned" : planned.map((m) => m.name).join(", ")}`}
                className={cn(
                  "flex h-full min-h-20 w-full flex-col gap-1 rounded-2xl border p-3 text-left transition-colors hover:border-foreground/40",
                  planned.length > 0 ? "bg-card" : "border-dashed",
                )}
              >
                <span className="text-xs font-semibold text-muted-foreground">{dayLabel(day, today)}</span>
                {planned.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Plan a meal</span>
                ) : (
                  planned.map((m) => (
                    <span key={m.id} className="line-clamp-2 text-sm font-medium">
                      {m.name}
                    </span>
                  ))
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {openDay && (
        <DaySheet day={openDay} today={today} meals={byDay.get(openDay) ?? []} recipes={recipes} onClose={() => setOpenDay(null)} />
      )}
      {shopping && (
        <AddToShoppingSheet
          groups={toShop.map((m) => ({ title: `${m.recipe.name} · ${dayLabel(m.day, today)}`, lines: parseIngredients(m.recipe.ingredients) }))}
          onClose={() => setShopping(false)}
        />
      )}
    </section>
  );
}

/**
 * One day of the Meal plan: what is planned (open it, or take it off), a field to type a meal that is not a Recipe
 * ("Leftovers", "Eating out"), and every Recipe to add.
 */
function DaySheet({
  day,
  today,
  meals,
  recipes,
  onClose,
}: {
  day: string;
  today: string;
  meals: Meal[];
  recipes: { id: string; name: string }[];
  onClose: () => void;
}) {
  const refresh = useRefreshRecipes();
  const plan = trpc.recipes.planMeal.useMutation({ onSuccess: refresh });
  const unplan = trpc.recipes.unplanMeal.useMutation({ onSuccess: refresh });
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const planned = new Set(meals.flatMap((m) => (m.recipe ? [m.recipe.id] : [])));
  const q = query.trim().toLowerCase();
  const choices = recipes.filter((r) => !planned.has(r.id) && (!q || r.name.toLowerCase().includes(q)));

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={dayLabel(day, today)} description="What's for dinner?">
      <div className="flex flex-col gap-5">
        {meals.length > 0 && (
          <ul className="flex flex-col divide-y divide-border/70">
            {meals.map((m) => (
              <li key={m.id} className="flex min-h-12 items-center gap-2">
                {m.recipe ? (
                  <Link href={`/lists/recipes/${m.recipe.id}`} className="min-w-0 flex-1 truncate text-base font-medium underline-offset-4 hover:underline md:text-sm">
                    {m.name}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-base font-medium md:text-sm">{m.name}</span>
                )}
                <Button variant="ghost" size="icon" aria-label={`Take ${m.name} off ${dayLabel(day, today)}`} onClick={() => unplan.mutate({ id: m.id })}>
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const name = typed.trim();
            if (!name) return;
            try {
              await plan.mutateAsync({ name, day });
              setTyped("");
            } catch {
              showToast("Couldn't plan that meal");
            }
          }}
        >
          <h3 className={SECTION_HEADING}>Type a meal</h3>
          <div className="flex gap-2">
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              maxLength={PLANNED_MEAL_NAME_MAX}
              placeholder="e.g. Leftovers, eating out"
              aria-label="A meal that is not a recipe"
              enterKeyHint="done"
            />
            <Button type="submit" variant="outline" disabled={!typed.trim() || plan.isPending}>
              Add
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <h3 className={SECTION_HEADING}>Or pick a recipe</h3>
          {recipes.length > 8 && (
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes" aria-label="Search recipes to plan" />
          )}
          <ul className="flex max-h-[40vh] flex-col divide-y divide-border/70 overflow-y-auto">
            {choices.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center text-left text-base hover:underline md:text-sm"
                  onClick={async () => {
                    await plan.mutateAsync({ recipeId: r.id, day });
                    showToast(`${r.name} planned for ${dayLabel(day, today).toLowerCase()}`);
                  }}
                >
                  {r.name}
                </button>
              </li>
            ))}
            {choices.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">{recipes.length === 0 ? "No recipes saved yet." : "No other recipes match."}</li>
            )}
          </ul>
        </div>
      </div>
    </ResponsiveSheet>
  );
}

/** Choose a day in the next two weeks to cook one Recipe. */
export function PlanRecipeSheet({ recipe, onClose }: { recipe: { id: string; name: string }; onClose: () => void }) {
  const today = useToday();
  const refresh = useRefreshRecipes();
  const { data: meals } = trpc.recipes.plan.useQuery({ from: today ?? "", days: 14 }, { enabled: !!today });
  const plan = trpc.recipes.planMeal.useMutation({ onSuccess: refresh });
  if (!today) return null;
  const mine = new Set((meals ?? []).filter((m) => m.recipe?.id === recipe.id).map((m) => m.day));
  const others = new Map<string, string[]>();
  for (const m of meals ?? []) if (m.recipe?.id !== recipe.id) others.set(m.day, [...(others.get(m.day) ?? []), m.name]);

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="Plan this recipe" description="Pick the day you'll cook it.">
      <ul className="flex max-h-[60vh] flex-col divide-y divide-border/70 overflow-y-auto">
        {upcomingDays(today, 14).map((day) => (
          <li key={day}>
            <button
              type="button"
              disabled={mine.has(day)}
              className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-base disabled:opacity-60 md:text-sm"
              onClick={async () => {
                await plan.mutateAsync({ recipeId: recipe.id, day });
                showToast(`${recipe.name} planned for ${dayLabel(day, today).toLowerCase()}`);
                onClose();
              }}
            >
              <span className="font-medium">{dayLabel(day, today)}</span>
              <span className="min-w-0 truncate text-sm text-muted-foreground md:text-xs">
                {mine.has(day) ? "Already planned" : (others.get(day) ?? []).join(", ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ResponsiveSheet>
  );
}
