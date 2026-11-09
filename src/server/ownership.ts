type Who = { householdId: string; userId: string };

/**
 * The ownership rules every owned collection shares (Cookbooks, Watchlists; Notebooks and Vault Entries follow the
 * same ones in their own files). Readable: Shared, yours, or a housemate's Personal one they've left visible.
 */
export const readableBy = (ctx: Who) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }, { ownerId: { not: null }, visibleToHousehold: true }],
});

/** Editable: Shared, or yours. Visibility never grants edit rights. */
export const editableBy = (ctx: Who) => ({
  householdId: ctx.householdId,
  OR: [{ ownerId: null }, { ownerId: ctx.userId }],
});
