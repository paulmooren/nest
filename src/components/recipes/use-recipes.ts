"use client";

import { useSyncExternalStore } from "react";

import { trpc } from "@/trpc/react";
import { dayKey } from "@/lib/recipes";

/** Refreshes everything that shows a Recipe, Cookbook or Planned meal after a create, edit, move or delete. */
export function useRefreshRecipes() {
  const utils = trpc.useUtils();
  return () =>
    Promise.all([
      utils.recipes.list.invalidate(),
      utils.recipes.get.invalidate(),
      utils.recipes.listCookbooks.invalidate(),
      utils.recipes.plan.invalidate(),
    ]);
}

const never = () => () => {};

/** Today as a day key in the viewer's own clock; null while rendering on the server, which has a different clock. */
export function useToday(): string | null {
  return useSyncExternalStore(
    never,
    () => dayKey(new Date()),
    () => null,
  );
}
