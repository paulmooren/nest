"use client";

import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, WalletIcon } from "lucide-react";

import { ACCOUNT_TYPE_LABELS, ASSET_ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import { monthlyOf, type Entry } from "@/lib/budget-scope";
import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { RowList } from "@/components/ui/row";
import type { Item } from "@/components/finance/budget-types";
import { ExpenseSections, type BudgetGroup } from "@/components/finance/expense-sections";
import { SortableList } from "@/components/sortable-list";

export type AccountSummary = { id: string; name: string; type: string; institution: string | null };

export const isAssetType = (type: string) => (ASSET_ACCOUNT_TYPES as readonly string[]).includes(type);

/** Rows inside an opened account sit on the page, not in a box of their own. */
const FLAT = "md:overflow-visible md:rounded-none md:border-0 md:bg-transparent";

/** The Income / Expenses divider of an opened account: the label and, bigger than any item, what it adds up to. */
function SideHeading({ side, total }: { side: "INCOME" | "EXPENSE"; total: number }) {
  const income = side === "INCOME";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b pb-2">
      <h3 className="text-base font-semibold">{income ? "Income" : "Expenses"}</h3>
      <p className={cn("font-heading text-xl font-bold tabular-nums", income ? "text-success" : "text-destructive")}>
        {formatEUR(total)}
        <span className="text-sm font-normal text-muted-foreground"> / mo</span>
      </p>
    </div>
  );
}

/**
 * One account of the Budget page: its name and balance, what recurs on it each month, and (opened) its income and
 * expenses to edit. An account with nothing recurring on it still shows, with just its balance. `account` is null for
 * the items that run through no account.
 */
export function AccountSection({
  account,
  entries,
  open,
  onToggle,
  groups,
  usedGroupIds,
  renderRow,
  onReorder,
  onMove,
  onRenameGroup,
  onDeleteGroup,
}: {
  account: AccountSummary | null;
  entries: Entry<Item>[];
  open: boolean;
  onToggle: () => void;
  groups: BudgetGroup[];
  usedGroupIds: Set<string>;
  renderRow: (entry: Entry<Item>) => React.ReactNode;
  onReorder: (ids: string[]) => void;
  onMove: (move: { id: string; groupId: string | null; ids: string[] }) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const income = entries.filter((e) => e.side === "INCOME");
  const expenses = entries.filter((e) => e.side === "EXPENSE");
  const sum = (list: Entry<Item>[]) => list.reduce((s, e) => s + monthlyOf(e.item), 0);

  const meta = account ? ACCOUNT_TYPE_LABELS[account.type as AccountType] : "Not linked to an account";

  return (
    <li className="py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group/row group -mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border bg-muted text-muted-foreground">
          <span className="block size-4">{account ? <AccountTypeIcon type={account.type} /> : <WalletIcon className="size-4" />}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-base font-medium md:text-sm", "decoration-foreground/60 decoration-1 underline-offset-4 group-hover/row:underline group-focus-within/row:underline")}>{account?.name ?? "No account"}</span>
          <span className="block truncate text-sm text-muted-foreground md:text-xs">{meta}</span>
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mb-3 flex flex-col gap-8 md:ml-12 md:pr-4">
          {income.length > 0 && (
            <section aria-label="Income" className="flex flex-col gap-1 border-l-2 border-success pl-4">
              <SideHeading side="INCOME" total={sum(income)} />
              <SortableList ids={income.map((e) => e.item.id)} onReorder={onReorder}>
                <RowList className={FLAT}>{income.map(renderRow)}</RowList>
              </SortableList>
            </section>
          )}

          {expenses.length > 0 && (
            <section aria-label="Expenses" className="flex flex-col gap-1 border-l-2 border-destructive pl-4">
              <SideHeading side="EXPENSE" total={sum(expenses)} />
              <ExpenseSections
                entries={expenses}
                groups={groups}
                usedGroupIds={usedGroupIds}
                hostsFresh={false}
                listClassName={FLAT}
                renderRow={renderRow}
                onReorder={onReorder}
                onMove={onMove}
                onRename={onRenameGroup}
                onDelete={onDeleteGroup}
              />
            </section>
          )}

          {entries.length === 0 && <p className="text-sm text-muted-foreground">Nothing recurring on this account yet.</p>}

          <div className="flex flex-wrap items-center gap-3">
            {account && (
              <Link
                href={`/finance/accounts/${account.id}`}
                className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Balance history and transactions
                <ChevronRightIcon className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
