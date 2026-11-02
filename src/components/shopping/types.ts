export type ShoppingItemData = {
  id: string;
  name: string;
  quantity: string | null;
  checkedAt: Date | string | null;
  addedBy: { id: string; name: string | null; email: string } | null;
};
