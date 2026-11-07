"use client";

import { trpc } from "@/trpc/react";

/** Refreshes everything that shows a Recipe or Cookbook after a create, edit, move or delete. */
export function useRefreshRecipes() {
  const utils = trpc.useUtils();
  return () => Promise.all([utils.recipes.list.invalidate(), utils.recipes.get.invalidate(), utils.recipes.listCookbooks.invalidate()]);
}
