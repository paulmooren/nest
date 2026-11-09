"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trpc } from "@/trpc/react";
import { ModuleGate } from "@/components/use-modules";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { RecipeEditor, type RecipeValues } from "@/components/recipes/recipe-editor";
import { RecipesBackLink, RecipesBones } from "@/components/recipes/recipes-ui";
import { useRefreshRecipes } from "@/components/recipes/use-recipes";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";
import { parseRecipeText } from "@/lib/recipes";

export default function NewRecipePage() {
  return (
    <ModuleGate module="recipes">
      <Suspense>
        <NewRecipe />
      </Suspense>
    </ModuleGate>
  );
}

type Start = { values: Partial<RecipeValues>; note: { ok: boolean; text: string } | null };

/**
 * A new Recipe. It can arrive with something to start from: `?url=` (pasted on the Recipes page, or shared to Nest
 * from the phone's browser, which may put the link in `text`) is imported before the editor opens; shared text with
 * no link in it is split into Ingredients and steps.
 */
function NewRecipe() {
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("cookbook");
  const sharedText = params.get("text") ?? "";
  const link = params.get("url") || /https?:\/\/\S+/i.exec(sharedText)?.[0] || "";

  const { data: cookbooks } = trpc.recipes.listCookbooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const create = trpc.recipes.create.useMutation();
  const importFromUrl = trpc.recipes.importFromUrl.useMutation();
  const refresh = useRefreshRecipes();
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState<Start | null>(() => {
    if (link) return null;
    if (!sharedText.trim()) return { values: {}, note: null };
    const draft = parseRecipeText(sharedText);
    return {
      values: { name: draft.name || (params.get("title") ?? ""), servings: draft.servings, ingredients: draft.ingredients.join("\n"), steps: draft.steps.join("\n") },
      note: { ok: true, text: "Split into ingredients and steps. Check it, then save." },
    };
  });

  const importLink = importFromUrl.mutateAsync;
  const asked = useRef(false);
  useEffect(() => {
    if (!link || asked.current) return;
    asked.current = true;
    importLink({ url: link }).then(
      (draft) => setStart({ values: { ...draft, sourceUrl: link }, note: { ok: true, text: "Filled in from the link. Check it, then save." } }),
      (e: unknown) =>
        setStart({
          values: { sourceUrl: link, name: params.get("title") ?? "" },
          note: { ok: false, text: e instanceof Error && e.message ? e.message : "Couldn't import that link." },
        }),
    );
  }, [link, importLink, params]);

  if (!cookbooks || !me) return null;
  const editable = cookbooks.filter((c) => c.ownerId === null || c.ownerId === me.id);
  const first = editable.find((c) => c.id === wanted) ?? editable.find((c) => c.isStarter) ?? editable[0];
  if (!first) return null;

  return (
    <>
      <RecipesBackLink />
      <PageHeader title="New recipe" />
      <PageBody>
        {!start ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              Reading the recipe from the link…
            </p>
            <RecipesBones rows={3} />
          </div>
        ) : (
          <RecipeEditor
            initial={{
              name: "",
              cookbookId: first.id,
              ingredients: "",
              steps: "",
              servings: null,
              sourceUrl: null,
              totalMinutes: null,
              imageUrl: null,
              ...start.values,
            }}
            note={start.note}
            cookbooks={editable}
            pending={saving}
            submitLabel="Save recipe"
            onImport={(url) => importFromUrl.mutateAsync({ url })}
            onCancel={() => router.push("/lists/recipes")}
            onSubmit={async (values) => {
              setSaving(true);
              const id = newId();
              try {
                await create.mutateAsync({ id, ...values });
              } catch {
                setSaving(false);
                showToast("Couldn't save this recipe");
                return;
              }
              await refresh();
              router.replace(`/lists/recipes/${id}`);
            }}
          />
        )}
      </PageBody>
    </>
  );
}
