"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trpc } from "@/trpc/react";
import { ModuleGate } from "@/components/use-modules";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { RecipesBackLink } from "@/components/recipes/recipes-ui";
import { useRefreshRecipes } from "@/components/recipes/use-recipes";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";

export default function NewRecipePage() {
  return (
    <ModuleGate module="recipes">
      <Suspense>
        <NewRecipe />
      </Suspense>
    </ModuleGate>
  );
}

function NewRecipe() {
  const router = useRouter();
  const wanted = useSearchParams().get("cookbook");
  const { data: cookbooks } = trpc.recipes.listCookbooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const create = trpc.recipes.create.useMutation();
  const refresh = useRefreshRecipes();
  const [saving, setSaving] = useState(false);

  if (!cookbooks || !me) return null;
  const editable = cookbooks.filter((c) => c.ownerId === null || c.ownerId === me.id);
  const start = editable.find((c) => c.id === wanted) ?? editable.find((c) => c.isStarter) ?? editable[0];
  if (!start) return null;

  return (
    <>
      <RecipesBackLink />
      <PageHeader title="New recipe" />
      <PageBody>
        <RecipeEditor
          initial={{ name: "", cookbookId: start.id, ingredients: "", steps: "", servings: null, sourceUrl: null }}
          cookbooks={editable}
          pending={saving}
          submitLabel="Save recipe"
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
      </PageBody>
    </>
  );
}
