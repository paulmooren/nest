"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@trpc/client";

import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { IngredientList, RecipesBackLink, RecipesBones, Steps } from "@/components/recipes/recipes-ui";
import { useRefreshRecipes } from "@/components/recipes/use-recipes";
import { showToast } from "@/components/toast";

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModuleGate module="recipes">
      <RecipeDetail id={id} />
    </ModuleGate>
  );
}

const isConflict = (e: unknown) => e instanceof TRPCClientError && e.data?.code === "CONFLICT";

function RecipeDetail({ id }: { id: string }) {
  const router = useRouter();
  const refresh = useRefreshRecipes();
  const { data: recipe, error } = trpc.recipes.get.useQuery({ id }, { retry: false });
  const { data: cookbooks } = trpc.recipes.listCookbooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!recipe && !error);

  const name = recipe?.name;
  useEffect(() => {
    if (name) document.title = `${name} · Recipes · Nest`;
  }, [name]);

  const [editing, setEditing] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const update = trpc.recipes.update.useMutation();
  const remove = trpc.recipes.delete.useMutation({ onSuccess: refresh });

  if (error) {
    return (
      <>
        <RecipesBackLink />
        <EmptyState title="This recipe doesn't exist, or you can't see it." />
      </>
    );
  }
  if (!recipe || !cookbooks || !me) return showSkeleton ? <RecipesBones rows={4} /> : null;

  const isShared = recipe.ownerId === null;
  const canEdit = isShared || recipe.ownerId === me.id;
  const members = household?.members ?? [];
  const owner = members.find((m) => m.user.id === recipe.ownerId);
  const editable = cookbooks.filter((c) => c.ownerId === null || c.ownerId === me.id);

  if (editing) {
    return (
      <>
        <RecipesBackLink />
        <PageHeader title={`Edit ${recipe.name}`} />
        <PageBody>
          <RecipeEditor
            initial={{
              name: recipe.name,
              cookbookId: recipe.cookbookId,
              ingredients: recipe.ingredients,
              steps: recipe.steps,
              servings: recipe.servings,
              sourceUrl: recipe.sourceUrl,
            }}
            cookbooks={editable}
            pending={update.isPending}
            error={conflict}
            onCancel={() => {
              setEditing(false);
              setConflict(null);
            }}
            onReload={async () => {
              await refresh();
              setEditing(false);
              setConflict(null);
            }}
            onSubmit={async (values) => {
              setConflict(null);
              try {
                await update.mutateAsync({ id, ...values, expectedUpdatedAt: recipe.updatedAt });
              } catch (e) {
                if (isConflict(e)) setConflict("Someone else changed this recipe since you opened it. Copy your text if you need it, then reload.");
                else showToast("Couldn't save this recipe");
                return;
              }
              await refresh();
              setEditing(false);
            }}
          />
        </PageBody>
      </>
    );
  }

  const whose = isShared
    ? "Shared"
    : recipe.ownerId === me.id
      ? "Personal"
      : members.length > 1 && owner
        ? `${owner.user.name || owner.user.email}'s`
        : "Personal";

  return (
    <>
      <RecipesBackLink />
      <PageHeader
        title={recipe.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{recipe.cookbookName}</span>
            <span className="inline-flex items-center gap-1.5">
              {!isShared && owner && members.length > 1 && (
                <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={18} />
              )}
              {whose}
            </span>
            {recipe.servings && <span>{recipe.servings} servings</span>}
            {!canEdit && <span>Visible to you</span>}
          </span>
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <Button onClick={() => setEditing(true)}>Edit</Button>}
          {recipe.sourceUrl && (
            <Button variant="outline" render={<a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
              Open source
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" className="text-destructive" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
        </div>

        <section aria-label="Ingredients" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">Ingredients</h2>
          <IngredientList text={recipe.ingredients} />
        </section>
        <section aria-label="Steps" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">Steps</h2>
          <Steps text={recipe.steps} />
        </section>
      </PageBody>

      <ConfirmDelete
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete "${recipe.name}"?`}
        description="This can't be undone."
        onConfirm={async () => {
          await remove.mutateAsync({ id });
          router.push("/lists/recipes");
        }}
      />
    </>
  );
}
