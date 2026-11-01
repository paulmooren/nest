import type { ScheduleUnit } from "@/lib/schedule";

export type TxType = "EXPENSE" | "INCOME" | "TRANSFER";

/** Stands for "no account" in the account selection. */
export const NO_ACCOUNT = "none";

export type Suggestion = {
  matchKey: string;
  name: string;
  type: TxType;
  amount: number;
  amountVaries: boolean;
  intervalCount: number;
  intervalUnit: "WEEK" | "MONTH";
  occurrences: number;
  lastDate: string | Date;
  confident: boolean;
  ownerId: string | null;
  accountId: string | null;
};

export type Item = {
  id: string;
  name: string;
  type: TxType;
  amount: number;
  amountVaries: boolean;
  intervalCount: number;
  intervalUnit: ScheduleUnit;
  paymentCount: number;
  /** The Budget group of an expense; null is "Other". */
  budgetGroupId: string | null;
  /** A different amount the payments suggest, waiting for the Member to approve it. */
  proposal: number | null;
  /** For a Fixed item: what its latest payment was, when that has drifted from the typed amount. */
  drift: number | null;
  source: "MANUAL" | "DETECTED";
  nextDueDate: string | Date | null;
  lastSeenAt: string | Date | null;
  categoryId: string | null;
  category: { color: string; name: string } | null;
  ownerId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  visibleToHousehold: boolean;
};

export type FormValues = {
  name: string;
  amount: number;
  intervalCount: number;
  intervalUnit: ScheduleUnit;
  categoryId: string | null;
  ownerId: string | null;
  accountId: string | null;
  /** An existing group, or null for "Other" (left out: unchanged). */
  budgetGroupId?: string | null;
  /** A group to create on the spot and use. */
  newGroupName?: string;
  /** The date (YYYY-MM-DD) the next payment is due; left out when unchanged. */
  nextDate?: string;
};

export type AccountOption = { id: string; name: string; institution: string | null; ownerId: string | null };
