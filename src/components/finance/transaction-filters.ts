import { formatEUR } from "@/lib/format";

/** Dates are "YYYY-MM-DD"; `categoryIds` may include "none" for uncategorized. Amounts are absolute (no minus sign). */
export type TransactionFilters = {
  from?: string;
  to?: string;
  /** Label for a preset range, shown instead of the raw dates. */
  dateLabel?: string;
  categoryIds: string[];
  minAmount?: number;
  maxAmount?: number;
};

export const NO_FILTERS: TransactionFilters = { categoryIds: [] };

export function hasFilters(f: TransactionFilters) {
  return !!(f.from || f.to || f.categoryIds.length || f.minAmount !== undefined || f.maxAmount !== undefined);
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: "Last 7 days",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from: iso(from), to: iso(to) };
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: iso(from), to: iso(to) };
    },
  },
  {
    label: "This month",
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    },
  },
  {
    label: "Last month",
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    },
  },
  {
    label: "Last 3 months",
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(now) };
    },
  },
  {
    label: "This year",
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)) };
    },
  },
];

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

export function dateSummary(f: TransactionFilters) {
  if (f.dateLabel) return f.dateLabel;
  if (f.from && f.to) return `${shortDate(f.from)} – ${shortDate(f.to)}`;
  if (f.from) return `From ${shortDate(f.from)}`;
  if (f.to) return `Until ${shortDate(f.to)}`;
  return "";
}

export function amountSummary(f: TransactionFilters) {
  const { minAmount: min, maxAmount: max } = f;
  if (min !== undefined && max !== undefined) return `${formatEUR(min)} – ${formatEUR(max)}`;
  if (min !== undefined) return `At least ${formatEUR(min)}`;
  if (max !== undefined) return `Up to ${formatEUR(max)}`;
  return "";
}
