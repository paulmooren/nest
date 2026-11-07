"use client";

import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { parseIngredients } from "@/lib/recipes";

/** The way back from a Recipe or the new-Recipe screen to the Recipes list. */
export function RecipesBackLink() {
  return (
    <Link
      href="/lists/recipes"
      className="-mt-2 mb-2 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" aria-hidden />
      Recipes
    </Link>
  );
}

export function RecipesBones({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="h-11 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** A Recipe's Ingredients, one per line. */
export function IngredientList({ text }: { text: string }) {
  const lines = parseIngredients(text);
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">No ingredients yet.</p>;
  return (
    <ul className="flex max-w-3xl flex-col gap-1.5 text-base md:text-sm">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2.5 pl-1">
          <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-foreground/60" />
          <span className="min-w-0 break-words">{line}</span>
        </li>
      ))}
    </ul>
  );
}

/** A Recipe's steps, one paragraph per non-empty line. */
export function Steps({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">No steps yet.</p>;
  return (
    <ol className="flex max-w-3xl list-decimal flex-col gap-2 pl-6 text-base marker:text-muted-foreground md:text-sm">
      {lines.map((line, i) => (
        <li key={i} className="break-words pl-1">
          {line}
        </li>
      ))}
    </ol>
  );
}
