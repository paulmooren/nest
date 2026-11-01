export type WishFormValues = {
  title: string;
  url: string | null;
  price: number | null;
  note: string | null;
};

export type WishData = {
  id: string;
  title: string;
  url: string | null;
  price: number | null;
  note: string | null;
  receivedAt: Date | string | null;
  claimedBy: { id: string; name: string | null; email: string } | null;
  claimedByMe: boolean;
};
