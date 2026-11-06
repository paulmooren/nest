"use client";

import { trpc } from "@/trpc/react";

/** Refreshes everything that shows a Note or Notebook after a create, edit, move or delete. */
export function useRefreshNotes() {
  const utils = trpc.useUtils();
  return () => Promise.all([utils.notes.list.invalidate(), utils.notes.get.invalidate(), utils.notes.listNotebooks.invalidate()]);
}
