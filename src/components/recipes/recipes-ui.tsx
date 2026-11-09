"use client";

import Link from "next/link";
import { ChevronLeftIcon, MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** The way back from a Recipe or the new-Recipe screen to the Recipes list (or wherever `href` says). */
export function RecipesBackLink({ href = "/lists/recipes", children = "Recipes" }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-mt-2 mb-2 inline-flex min-h-11 w-fit max-w-full items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
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

/** A Recipe's photo. It lives on the site the Recipe was imported from, so it is asked for without saying who asks. */
export function RecipePhoto({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a photo on someone else's site; not ours to optimise or copy
    <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={cn("bg-muted object-cover", className)} />
  );
}

/** Ingredient lines, as a plain list. */
export function IngredientList({ lines }: { lines: string[] }) {
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

/** A Recipe's steps, numbered. */
export function Steps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return <p className="text-sm text-muted-foreground">No steps yet.</p>;
  return (
    <ol className="flex max-w-3xl list-decimal flex-col gap-2 pl-6 text-base marker:text-muted-foreground md:text-sm">
      {steps.map((line, i) => (
        <li key={i} className="break-words pl-1">
          {line}
        </li>
      ))}
    </ol>
  );
}

/** Cook for more or fewer people: the Ingredients shown follow. */
export function ServingsStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Servings">
      <Button type="button" variant="outline" size="icon" aria-label="Fewer servings" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <MinusIcon />
      </Button>
      <span className="min-w-24 text-center text-base font-medium tabular-nums md:text-sm" aria-live="polite">
        {value} {value === 1 ? "serving" : "servings"}
      </span>
      <Button type="button" variant="outline" size="icon" aria-label="More servings" disabled={value >= 99} onClick={() => onChange(value + 1)}>
        <PlusIcon />
      </Button>
    </div>
  );
}

export const SECTION_HEADING = "text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase";
