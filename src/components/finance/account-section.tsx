"use client";

import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, WalletIcon } from "lucide-react";

import { ACCOUNT_TYPE_LABELS, ASSET_ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import { monthlyOf, type Entry } from "@/lib/budget-scope";
import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { AddChip } from "@/components/ui/choice-chips";
import { RowList } from "@/components/ui/row";
import type { Item } from "@/components/finance/budget-types";
import { ExpenseSections, type BudgetGroup } from "@/components/finance/expense-sections";
import { SortableList } from "@/components/sortable-list";

export type AccountSummary = { id: string; name: string; type: string; institution: string | null; balance: unknown };

export const isAssetType = (type: string) => (ASSET_ACCOUNT_TYPES as readonly string[]).includes(type);

const subHeading = "text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase";

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
  onAddItem,
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
  onAddItem?: () => void;
}) {
  const income = entries.filter((e) => e.side === "INCOME");
  const expenses = entries.filter((e) => e.side === "EXPENSE");
  const sum = (list: Entry<Item>[]) => list.reduce((s, e) => s + monthlyOf(e.item), 0);
  const balance = account ? Number(account.balance) : 0;
  const liability = account ? !isAssetType(account.type) : false;

  const flow = entries.length > 0 ? `${formatEUR(sum(income))} in · ${formatEUR(sum(expenses))} out` : null;
  const meta = flow ?? (account ? account.institution || ACCOUNT_TYPE_LABELS[account.type as AccountType] : "Not linked to an account");

  return (
    <li className="py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border bg-muted text-muted-foreground">
          <span className="block size-4">{account ? <AccountTypeIcon type={account.type} /> : <WalletIcon className="size-4" />}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium md:text-sm">{account?.name ?? "No account"}</span>
          <span className="block truncate text-sm text-muted-foreground md:text-xs">{meta}</span>
        </span>
        {account && (
          <span className="shrink-0 text-base font-semibold tabular-nums md:text-sm">
            {liability ? "−" : ""}
            {formatEUR(Math.abs(balance))}
          </span>
        )}
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mb-3 flex flex-col gap-5 md:ml-12">
          {income.length > 0 && (
            <section aria-label="Income" className="flex flex-col gap-2">
              <h3 className={cn(subHeading, "flex items-center justify-between gap-3")}>
                Income
                <span className="font-normal tracking-normal normal-case tabular-nums">{formatEUR(sum(income))} / mo</span>
              </h3>
              <SortableList ids={income.map((e) => e.item.id)} onReorder={onReorder}>
                <RowList>{income.map(renderRow)}</RowList>
              </SortableList>
            </section>
          )}

          {expenses.length > 0 && (
            <section aria-label="Expenses" className="flex flex-col gap-2">
              <h3 className={cn(subHeading, "flex items-center justify-between gap-3")}>
                Expenses
                <span className="font-normal tracking-normal normal-case tabular-nums">{formatEUR(sum(expenses))} / mo</span>
              </h3>
              <ExpenseSections
                entries={expenses}
                groups={groups}
                usedGroupIds={usedGroupIds}
                hostsFresh={false}
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
            {onAddItem && <AddChip onClick={onAddItem}>Item</AddChip>}
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
