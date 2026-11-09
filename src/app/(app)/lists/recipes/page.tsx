"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { PlusIcon, SettingsIcon, ShuffleIcon } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { AddChip, ChoiceChips } from "@/components/ui/choice-chips";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Row, RowList } from "@/components/ui/row";
import { ListsPage } from "@/components/lists/lists-page";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate, useModules } from "@/components/use-modules";
import { CookbookSettingsSheet, DeleteCookbookSheet, NewCookbookSheet } from "@/components/recipes/cookbook-sheets";
import { MealPlan } from "@/components/recipes/meal-plan";
import { RecipePhoto, RecipesBones } from "@/components/recipes/recipes-ui";
import { useRefreshRecipes } from "@/components/recipes/use-recipes";
import { newId } from "@/lib/client-id";
import { formatMinutes, recipePhotoSrc } from "@/lib/recipes";

export default function RecipesPage() {
  return (
    <ModuleGate module="recipes">
      <Recipes />
    </ModuleGate>
  );
}

type Recipe = inferRouterOutputs<AppRouter>["recipes"]["list"][number];

/** Ways to narrow the list when deciding what to cook. */
type Idea = "all" | "quick" | "new" | "again";
const QUICK_MINUTES = 30;
const AGAIN_DAYS = 30;

function matchesIdea(recipe: Recipe, idea: Idea, now: number): boolean {
  switch (idea) {
    case "quick":
      return recipe.totalMinutes !== null && recipe.totalMinutes <= QUICK_MINUTES;
    case "new":
      return recipe.cookedCount === 0;
    case "again":
      return recipe.lastCookedAt !== null && now - new Date(recipe.lastCookedAt).getTime() > AGAIN_DAYS * 86_400_000;
    default:
      return true;
  }
}

function Recipes() {
  const router = useRouter();
  const refresh = useRefreshRecipes();
  const { isEnabled } = useModules();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: recipes } = trpc.recipes.list.useQuery(search ? { query: search } : undefined, { placeholderData: keepPreviousData });
  // The Meal plan picks from every Recipe, whatever is being searched for.
  const { data: everyRecipe } = trpc.recipes.list.useQuery();
  const { data: cookbooks } = trpc.recipes.listCookbooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!recipes || !cookbooks || !me);

  const [cookbookId, setCookbookId] = useState("all");
  const [idea, setIdea] = useState<Idea>("all");
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Read once, when the page opens: "not cooked lately" does not need to change by the second.
  const [openedAt] = useState(() => Date.now());

  const createCookbook = trpc.recipes.createCookbook.useMutation({ onSuccess: refresh });
  const renameCookbook = trpc.recipes.renameCookbook.useMutation({ onSuccess: refresh });
  const setVisibility = trpc.recipes.setCookbookVisibility.useMutation({ onSuccess: refresh });
  const deleteCookbook = trpc.recipes.deleteCookbook.useMutation({ onSuccess: refresh });

  const members = household?.members ?? [];
  const multiMember = members.length > 1;

  const starter = cookbooks?.find((c) => c.isStarter);
  const selected = cookbooks?.find((c) => c.id === cookbookId);
  // New recipes go in the Cookbook being looked at when it is yours or shared, otherwise the starter one.
  const target = selected && (selected.ownerId === null || selected.ownerId === me?.id) ? selected : starter;

  const newRecipe = (
    <Button render={<Link href={target ? `/lists/recipes/new?cookbook=${target.id}` : "/lists/recipes/new"} />} nativeButton={false}>
      <PlusIcon /> New recipe
    </Button>
  );

  if (!recipes || !cookbooks || !me) {
    return <ListsPage actions={newRecipe}>{showSkeleton && <RecipesBones />}</ListsPage>;
  }

  const searching = search !== "";
  const inCookbook = cookbookId === "all" ? recipes : recipes.filter((r) => r.cookbookId === cookbookId);
  const visible = inCookbook.filter((r) => matchesIdea(r, idea, openedAt));
  const counts = new Map<string, number>();
  for (const r of recipes) counts.set(r.cookbookId, (counts.get(r.cookbookId) ?? 0) + 1);
  const cookbookName = new Map(cookbooks.map((c) => [c.id, c.name]));
  const mine = !!selected && (selected.ownerId === null || selected.ownerId === me.id);
  const destinations = cookbooks.filter((c) => c.id !== selected?.id && (c.ownerId === null || c.ownerId === me.id));

  const row = (recipe: Recipe) => {
    const cb = cookbooks.find((c) => c.id === recipe.cookbookId);
    const owner = multiMember && cb?.ownerId ? members.find((m) => m.user.id === cb.ownerId) : undefined;
    const photo = recipePhotoSrc(recipe);
    const meta = [
      cookbookId === "all" || searching ? cookbookName.get(recipe.cookbookId) : undefined,
      recipe.totalMinutes ? formatMinutes(recipe.totalMinutes) : undefined,
      recipe.excerpt || undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <Row
        key={recipe.id}
        href={`/lists/recipes/${recipe.id}`}
        leading={
          photo ? (
            <RecipePhoto src={photo} className="size-11 rounded-lg" />
          ) : owner ? (
            <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={24} />
          ) : undefined
        }
        title={recipe.name}
        meta={meta || undefined}
        trailing={
          recipe.cookedCount > 0 ? <span className="text-sm text-muted-foreground md:text-xs">Cooked {recipe.cookedCount}×</span> : undefined
        }
      />
    );
  };

  return (
    <>
      <ListsPage actions={newRecipe}>
        {(everyRecipe?.length ?? 0) > 0 && <MealPlan recipes={everyRecipe ?? []} canShop={isEnabled("shopping")} />}

        {(recipes.length > 0 || searching) && (
          <div className="flex flex-col gap-3">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names, ingredients and steps"
              aria-label="Search Recipes"
              className="md:max-w-md"
            />
            <ChoiceChips
              label="Filter by cookbook"
              value={cookbookId}
              onChange={setCookbookId}
              options={[
                { value: "all", label: "All" },
                ...cookbooks.map((c) => ({ value: c.id, label: `${c.name} ${searching ? (counts.get(c.id) ?? 0) : c.recipeCount}` })),
              ]}
              trailing={<AddChip onClick={() => setCreating(true)}>New cookbook</AddChip>}
            />
            <div className="flex flex-wrap items-center gap-2">
              <ChoiceChips<Idea>
                label="What to cook"
                value={idea}
                onChange={setIdea}
                options={[
                  { value: "all", label: "Anything" },
                  { value: "quick", label: `Under ${QUICK_MINUTES} min` },
                  { value: "new", label: "Not cooked yet" },
                  { value: "again", label: "Not cooked lately" },
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={visible.length === 0}
                onClick={() => router.push(`/lists/recipes/${visible[Math.floor(Math.random() * visible.length)].id}`)}
              >
                <ShuffleIcon /> Surprise me
              </Button>
            </div>
          </div>
        )}

        {selected && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.ownerId === null
                  ? "Shared — everyone in your household"
                  : selected.ownerId === me.id
                    ? selected.visibleToHousehold
                      ? "Personal — visible to your household"
                      : "Personal — only you"
                    : "Personal — visible to you"}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Settings for ${selected.name}`} onClick={() => setSettings(true)}>
              <SettingsIcon />
            </Button>
          </div>
        )}

        {recipes.length === 0 && !searching && (
          <EmptyState
            title="No recipes yet. Start a new recipe and paste a link: Nest reads the recipe for you. Or write one down yourself."
            action={newRecipe}
          />
        )}
        {recipes.length === 0 && searching && (
          <EmptyState title="Nothing matches. Search looks in names, ingredients and steps of every cookbook you can see." />
        )}
        {recipes.length > 0 && inCookbook.length === 0 && <EmptyState title="No recipes in this cookbook yet." action={newRecipe} />}
        {inCookbook.length > 0 && visible.length === 0 && (
          <EmptyState
            title={
              idea === "quick"
                ? `Nothing here takes under ${QUICK_MINUTES} minutes. Recipes need a time filled in to show up.`
                : idea === "new"
                  ? "You've cooked everything here at least once."
                  : "Nothing here has gone uncooked for a month."
            }
          />
        )}
        {visible.length > 0 && (
          <section aria-label={searching ? `${visible.length} recipes` : "Recipes"}>
            <RowList>{visible.map(row)}</RowList>
          </section>
        )}
      </ListsPage>

      {creating && (
        <NewCookbookSheet
          onClose={() => setCreating(false)}
          onCreate={async (name, shared) => {
            const id = newId();
            await createCookbook.mutateAsync({ id, name, shared });
            setCookbookId(id);
          }}
        />
      )}
      {settings && selected && (
        <CookbookSettingsSheet
          cookbook={selected}
          mine={mine}
          multiMember={multiMember}
          onClose={() => setSettings(false)}
          onRename={(name) => renameCookbook.mutate({ id: selected.id, name })}
          onVisibility={(visible) => setVisibility.mutate({ id: selected.id, visible })}
          onDelete={() => {
            setSettings(false);
            setDeleting(true);
          }}
        />
      )}
      {deleting && selected && (
        <DeleteCookbookSheet
          cookbook={selected}
          destinations={destinations}
          onClose={() => setDeleting(false)}
          onConfirm={async (moveTo) => {
            await deleteCookbook.mutateAsync({ id: selected.id, moveTo });
            setCookbookId("all");
          }}
        />
      )}
    </>
  );
}
