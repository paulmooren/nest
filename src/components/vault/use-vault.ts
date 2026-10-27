"use client";

import { trpc } from "@/trpc/react";
import { useOptimisticMutation } from "@/trpc/optimistic";

/**
 * Vault mutations that can be predicted show at once: pinning, Visibility and deleting. Creating and editing wait
 * for the server because they encrypt, and Attachments are uploaded separately (see uploads.ts). Revealing a
 * secret is not here: it waits for the server, which decrypts it.
 */
export function useVaultActions() {
  const scope = (v: { id?: string }) => (v.id ? `vault:${v.id}` : undefined);

  const remove = useOptimisticMutation("vault.delete", {
    lists: ["vault.list", "vault.expiringSoon"],
    scope,
    update: (v, cache) => cache.update("vault.list", (rows) => rows.filter((e) => e.id !== v.id)),
  });
  const setVisibility = useOptimisticMutation("vault.setVisibility", {
    lists: ["vault.list", "vault.get"],
    scope,
    update: (v, cache) =>
      cache.update("vault.list", (rows) => rows.map((e) => (e.id === v.id ? { ...e, visibleToHousehold: v.visible } : e))),
  });
  const setPinned = useOptimisticMutation("vault.setPinned", {
    lists: ["vault.list", "vault.get"],
    scope,
    update: (v, cache) =>
      cache.update("vault.list", (rows) => rows.map((e) => (e.id === v.id ? { ...e, pinned: v.pinned } : e))),
  });

  return { remove: remove.mutate, setVisibility: setVisibility.mutate, setPinned: setPinned.mutate };
}

/** Refreshes everything that shows an Entry after a create, edit or file change. */
export function useRefreshVault() {
  const utils = trpc.useUtils();
  return () =>
    Promise.all([utils.vault.list.invalidate(), utils.vault.get.invalidate(), utils.vault.expiringSoon.invalidate()]);
}
