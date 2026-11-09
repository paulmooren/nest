"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, TimerIcon, XIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ModuleGate } from "@/components/use-modules";
import { RecipesBackLink, RecipesBones, SECTION_HEADING } from "@/components/recipes/recipes-ui";
import { clock, useKeepScreenOn, useKitchenTimers } from "@/components/recipes/use-cooking";
import { useRefreshRecipes } from "@/components/recipes/use-recipes";
import { showToast } from "@/components/toast";
import { findTimers, ingredientsForStep, parseIngredients, scaleIngredient } from "@/lib/recipes";
import { cn } from "@/lib/utils";

export default function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModuleGate module="recipes">
      <Suspense>
        <Cook id={id} />
      </Suspense>
    </ModuleGate>
  );
}

/**
 * Cook mode: a Recipe one step at a time, in large type, for a phone propped up in the kitchen. It starts with
 * gathering the Ingredients, shows with each step the Ingredients that step uses, turns the times a step mentions
 * into timers, and keeps the screen on. Finishing the last step records the Recipe as Cooked.
 */
function Cook({ id }: { id: string }) {
  const router = useRouter();
  const refresh = useRefreshRecipes();
  const wanted = Number(useSearchParams().get("servings")) || null;
  const { data: recipe, error } = trpc.recipes.get.useQuery({ id }, { retry: false });
  const markCooked = trpc.recipes.markCooked.useMutation();
  const screenOn = useKeepScreenOn();
  const { timers, now, start, dismiss } = useKitchenTimers();

  // 0 is "gather your ingredients"; 1…n are the steps.
  const [at, setAt] = useState(0);
  const [have, setHave] = useState<Set<number>>(new Set());

  const stepCount = recipe ? parseIngredients(recipe.steps).length : 0;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(input|textarea|select|button)$/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") setAt((i) => Math.min(stepCount, i + 1));
      if (e.key === "ArrowLeft") setAt((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepCount]);

  const back = `/lists/recipes/${id}`;
  if (error) {
    return (
      <>
        <RecipesBackLink />
        <EmptyState title="This recipe doesn't exist, or you can't see it." />
      </>
    );
  }
  if (!recipe) return <RecipesBones rows={3} />;

  const factor = recipe.servings && wanted ? wanted / recipe.servings : 1;
  const servings = wanted ?? recipe.servings;
  const ingredients = parseIngredients(recipe.ingredients).map((l) => scaleIngredient(l, factor));
  const steps = parseIngredients(recipe.steps);
  const step = at > 0 ? steps[at - 1] : null;
  const last = at === steps.length;
  const used = step ? ingredientsForStep(ingredients, step) : [];
  const stepTimers = step ? findTimers(step) : [];

  const finish = async () => {
    try {
      await markCooked.mutateAsync({ id });
      await refresh();
      showToast(`${recipe.name} cooked. Enjoy!`);
    } catch {
      showToast("Couldn't record that you cooked this");
    }
    router.push(back);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <RecipesBackLink href={back}>{recipe.name}</RecipesBackLink>
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Progress through the recipe"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={at}
          >
            <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${steps.length ? (at / steps.length) * 100 : 0}%` }} />
          </div>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{at === 0 ? "Get ready" : `Step ${at} of ${steps.length}`}</span>
        </div>
      </div>

      {timers.length > 0 && (
        <ul aria-label="Timers" className="flex flex-wrap gap-2">
          {timers.map((t) => (
            <li
              key={t.id}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pr-1 pl-4 text-base font-medium tabular-nums",
                t.rung && "border-transparent bg-foreground text-background",
              )}
            >
              <TimerIcon className="size-4" aria-hidden />
              <span role={t.rung ? "alert" : undefined}>{t.rung ? `${t.label} timer done` : clock(t.endsAt - now)}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t.rung ? `Dismiss the ${t.label} timer` : `Stop the ${t.label} timer`}
                className={t.rung ? "text-background hover:bg-background/20 hover:text-background" : undefined}
                onClick={() => dismiss(t.id)}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {at === 0 ? (
        <section aria-label="Gather your ingredients" className="flex flex-col gap-3">
          <h1 className="font-heading text-2xl font-semibold md:text-3xl">Gather your ingredients</h1>
          <p className="text-sm text-muted-foreground">
            {servings ? `For ${servings} ${servings === 1 ? "serving" : "servings"}. ` : ""}
            Tick them off as you put them on the counter.
            {screenOn ? " The screen stays on while you cook." : ""}
          </p>
          {ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground">This recipe has no ingredients written down.</p>
          ) : (
            <ul className="flex flex-col">
              {ingredients.map((line, i) => (
                <li key={i}>
                  <label className="flex min-h-12 items-center gap-3 text-lg md:text-base">
                    <Checkbox
                      checked={have.has(i)}
                      onCheckedChange={() =>
                        setHave((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      aria-label={line}
                      className="rounded-md"
                    />
                    <span className={cn("min-w-0 break-words", have.has(i) && "text-muted-foreground line-through")}>{line}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-label={`Step ${at}`} className="flex flex-col gap-5">
          <p className="max-w-3xl text-2xl leading-snug font-medium break-words md:text-3xl md:leading-snug" aria-live="polite">
            {step}
          </p>

          {stepTimers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stepTimers.map((t) => (
                <Button key={t.seconds} variant="outline" size="lg" onClick={() => start(t.label, t.seconds)}>
                  <TimerIcon /> Start {t.label} timer
                </Button>
              ))}
            </div>
          )}

          {used.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className={SECTION_HEADING}>For this step</h2>
              <ul className="flex flex-col gap-1 text-lg md:text-base">
                {used.map((line, i) => (
                  <li key={i} className="break-words">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {at > 0 && ingredients.length > 0 && (
        <details className="max-w-3xl">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-muted-foreground">All ingredients</summary>
          <ul className="flex flex-col gap-1 pt-1 text-base md:text-sm">
            {ingredients.map((line, i) => (
              <li key={i} className="break-words">
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Always within reach, however long the step or the list is. */}
      <div className="sticky bottom-4 z-10 order-last flex max-w-3xl gap-2 rounded-2xl border bg-background p-2 shadow-lg md:bottom-6">
        <Button variant="outline" size="lg" className="h-14 flex-1 text-base" disabled={at === 0} onClick={() => setAt((i) => Math.max(0, i - 1))}>
          <ArrowLeftIcon /> Back
        </Button>
        {last ? (
          <Button size="lg" className="h-14 flex-[2] text-base" disabled={markCooked.isPending} onClick={finish}>
            <CheckIcon /> {steps.length === 0 ? "Done" : "Done cooking"}
          </Button>
        ) : (
          <Button size="lg" className="h-14 flex-[2] text-base" onClick={() => setAt((i) => i + 1)}>
            {at === 0 ? "Start cooking" : "Next step"} <ArrowRightIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
