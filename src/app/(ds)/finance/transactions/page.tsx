"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ListFilterIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { formatEUR } from "@/lib/format";
import { describeSchedule } from "@/lib/schedule";
import { describeImport, type ImportResult } from "@/lib/statement-import";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { ConfirmDelete } from "@/components/ds/confirm-delete";
import { EmptyState } from "@/components/ds/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ds/select";
import { Skeleton } from "@/components/ds/skeleton";
import { FinancePage } from "@/components/finance/finance-page";
import { MarkRecurringSheet, type RecurringSource } from "@/components/finance/mark-recurring-sheet";
import { groupLabel, type Member } from "@/components/finance/ownership-groups";
import {
  NO_FILTERS,
  amountSummary,
  dateSummary,
  hasFilters,
  type TransactionFilters,
} from "@/components/finance/transaction-filters";
import { TxFilterSheet } from "@/components/finance/tx-filter-sheet";
import { TxImportSheet } from "@/components/finance/tx-import-sheet";
import { TxRows, TxSheet, type Tx } from "@/components/finance/tx-list";
import { NewTxSheet } from "@/components/finance/tx-new-sheet";
import { useCategoryAssign } from "@/components/finance/use-category-assign";
import { AFTER_BULK_TRANSACTION_CHANGE, useTransactionActions } from "@/components/finance/use-transactions";
import { Toast, toastPrimary, toastSecondary } from "@/components/toast";
import { useDelayed } from "@/components/use-delayed";
import { useIsPhone } from "@/components/use-media-query";

const PAGE_SIZE = 200;
/** Phones load fewer rows at a time: a long list is slow to scroll and hard to find anything in. */
const PHONE_PAGE_SIZE = 50;

export default function TransactionsPage() {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
}

const dayKey = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

/** "Today", "Yesterday", "Mon 12 Oct" (with the year when it isn't this one). Dates are calendar days held as UTC midnight. */
function dayLabel(key: string) {
  const now = new Date();
  const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === local(now)) return "Today";
  if (key === local(yesterday)) return "Yesterday";
  const date = new Date(`${key}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getUTCFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

function Transactions() {
  const searchParams = useSearchParams();
  const importAccountId = searchParams.get("import");

  const { data: accounts } = trpc.account.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: recurring } = trpc.recurring.list.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();

  // Deep-linkable (?account=<id>) so the Budgets tab's account cards can open straight into one account.
  const [accountFilter, setAccountFilter] = useState(searchParams.get("account") ?? "");
  const [filters, setFilters] = useState<TransactionFilters>(NO_FILTERS);
  const [filtering, setFiltering] = useState(false);
  const [pages, setPages] = useState(1);
  const isPhone = useIsPhone();
  const limit = (isPhone ? PHONE_PAGE_SIZE : PAGE_SIZE) * pages;

  const [mode, setMode] = useState<"none" | "new" | "import">(importAccountId ? "import" : "none");
  const [openId, setOpenId] = useState<string | null>(null);
  const [removeAll, setRemoveAll] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [recurringFor, setRecurringFor] = useState<RecurringSource | null>(null);
  const [recurringAdded, setRecurringAdded] = useState<{ name: string; type: "EXPENSE" | "INCOME" | "TRANSFER" } | null>(null);

  const { data: transactions } = trpc.transaction.list.useQuery(
    {
      limit,
      ...(accountFilter ? { accountId: accountFilter } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...(filters.categoryIds.length ? { categoryIds: filters.categoryIds } : {}),
      ...(filters.minAmount !== undefined ? { minAmount: filters.minAmount } : {}),
      ...(filters.maxAmount !== undefined ? { maxAmount: filters.maxAmount } : {}),
    },
    // Keep the old rows on screen while a new filter loads, so the list doesn't flash empty.
    { placeholderData: (previous) => previous },
  );

  const transactionActions = useTransactionActions();
  const { assign: assignCategory, toast: categoryToast } = useCategoryAssign(categories ?? []);
  const refresh = useRefresh();
  // Removing everything, like importing, is worked out by the server: it waits, and the button shows it.
  const removeAllTransactions = trpc.transaction.removeAll.useMutation({
    onSuccess: () => refresh(...AFTER_BULK_TRANSACTION_CHANGE),
  });
  const showSkeleton = useDelayed(transactions === undefined);

  const members: Member[] = household?.members ?? [];
  const currentUserId = me?.id ?? "";
  const multiMember = members.length > 1;
  // Visible-but-not-yours accounts are read-only, so they're not offered when adding or importing.
  const writableAccounts = (accounts ?? []).filter((a) => a.ownerId === null || a.ownerId === currentUserId);
  const filtered = hasFilters(filters);
  const filteredAccount = accounts?.find((a) => a.id === accountFilter);

  // "Remove all" only ever touches transactions on accounts you can edit.
  const removableCount = (transactions ?? []).filter((t) =>
    accountFilter
      ? t.accountId === accountFilter && (t.account.ownerId === null || t.account.ownerId === currentUserId)
      : t.account.ownerId === null || t.account.ownerId === currentUserId,
  ).length;

  const recurringById = new Map((recurring ?? []).map((item) => [item.id, item]));
  const recurringOf = (t: Tx) => (t.recurringItemId && !t.recurringExcluded ? recurringById.get(t.recurringItemId) : undefined);

  const accountItems = [
    { value: "all", label: "All accounts" },
    ...(accounts ?? []).map((a) => ({
      value: a.id,
      label: multiMember ? `${a.name} · ${groupLabel(a.ownerId, members, currentUserId)}` : a.name,
    })),
  ];

  const groups: { key: string; rows: Tx[] }[] = [];
  for (const t of transactions ?? []) {
    const key = dayKey(t.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(t);
    else groups.push({ key, rows: [t] });
  }

  const open = transactions?.find((t) => t.id === openId);
  const openRecurring = open ? recurringOf(open) : undefined;
  const reset = () => setPages(1);

  const activeChips: { key: string; text: string; clear: () => void }[] = [];
  if (filters.from || filters.to)
    activeChips.push({ key: "date", text: dateSummary(filters), clear: () => setFilters({ ...filters, from: undefined, to: undefined, dateLabel: undefined }) });
  if (filters.categoryIds.length)
    activeChips.push({
      key: "cat",
      text: filters.categoryIds.length === 1 ? (categories?.find((c) => c.id === filters.categoryIds[0])?.name ?? "Uncategorized") : `${filters.categoryIds.length} categories`,
      clear: () => setFilters({ ...filters, categoryIds: [] }),
    });
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined)
    activeChips.push({ key: "amt", text: amountSummary(filters), clear: () => setFilters({ ...filters, minAmount: undefined, maxAmount: undefined }) });

  let spent = 0;
  let received = 0;
  for (const t of transactions ?? []) {
    if (t.type === "EXPENSE") spent += Number(t.amount);
    else if (t.type === "INCOME") received += Number(t.amount);
  }
  const truncated = (transactions?.length ?? 0) >= limit;

  return (
    <FinancePage
      actions={
        writableAccounts.length > 0 ? (
          <>
            <Button variant="outline" onClick={() => setMode("import")}>
              <UploadIcon /> Import
            </Button>
            <Button onClick={() => setMode("new")}>
              <PlusIcon /> Transaction
            </Button>
          </>
        ) : undefined
      }
    >
      {categoryToast}

      <div className="flex flex-wrap items-center gap-2">
        {accounts && accounts.length > 1 && (
          <Select
            items={accountItems}
            value={accountFilter || "all"}
            onValueChange={(v) => {
              setAccountFilter(v === "all" || v === null ? "" : v);
              reset();
            }}
          >
            <SelectTrigger aria-label="Filter by account" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accountItems.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" onClick={() => setFiltering(true)}>
          <ListFilterIcon /> Filters
          {activeChips.length > 0 && <Badge className="ml-1 h-5 min-w-5 px-1.5">{activeChips.length}</Badge>}
        </Button>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
          {activeChips.map((c) => (
            <Button
              key={c.key}
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                c.clear();
                reset();
              }}
              aria-label={`Remove filter: ${c.text}`}
            >
              {c.text}
              <XIcon />
            </Button>
          ))}
        </div>
      )}

      {filtered && transactions && (
        <p className="text-sm text-muted-foreground" role="status">
          {truncated ? `${transactions.length}+` : transactions.length} transaction{transactions.length === 1 ? "" : "s"}
          {truncated ? " — load more for exact totals" : ` · ${formatEUR(spent)} spent · ${formatEUR(received)} received`}
        </p>
      )}

      {transactions === undefined ? (
        showSkeleton && (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading…</span>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )
      ) : transactions.length === 0 ? (
        <EmptyState
          title={filtered ? "No transactions match these filters." : "No transactions yet."}
          action={
            !filtered && writableAccounts.length > 0 ? (
              <div className="flex gap-2">
                <Button onClick={() => setMode("new")}>Add one</Button>
                <Button variant="outline" onClick={() => setMode("import")}>
                  Import a statement
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.key} aria-label={dayLabel(g.key)} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">{dayLabel(g.key)}</h2>
            <TxRows
              transactions={g.rows}
              accountId={accountFilter || undefined}
              showAccount={multiMember}
              showDate={false}
              isRecurring={(t) => !!recurringOf(t)}
              onOpen={(t) => setOpenId(t.id)}
            />
          </section>
        ))
      )}

      {truncated && (
        <Button variant="outline" size="lg" onClick={() => setPages((p) => p + 1)}>
          Showing the latest {transactions?.length} · load more
        </Button>
      )}

      {removableCount > 0 && !filtered && (
        <Button
          variant="ghost"
          className="self-start text-destructive"
          disabled={removeAllTransactions.isPending}
          onClick={() => setRemoveAll(true)}
        >
          Remove all transactions…
        </Button>
      )}

      {open && (
        <TxSheet
          tx={open}
          accountId={accountFilter || undefined}
          categories={categories ?? []}
          canEdit={open.account.ownerId === null || open.account.ownerId === currentUserId}
          recurringText={
            openRecurring
              ? `Recurring · ${describeSchedule(openRecurring.intervalCount, openRecurring.intervalUnit).replace(/^Every /, "every ")}`
              : null
          }
          onCategory={(categoryId) => void assignCategory(open.id, categoryId)}
          onMarkRecurring={() => {
            setOpenId(null);
            setRecurringFor({
              id: open.id,
              merchant: open.merchant,
              type: open.type as "EXPENSE" | "INCOME" | "TRANSFER",
              amount: Number(open.amount),
              date: open.date,
              categoryId: open.categoryId,
              accountId: open.accountId,
              accountName: open.account.name,
              toAccountId: open.transferToAccountId,
              toAccountName: open.transferToAccount?.name,
            });
          }}
          onDelete={() => transactionActions.remove(open.id)}
          onClose={() => setOpenId(null)}
        />
      )}

      {filtering && (
        <TxFilterSheet
          filters={filters}
          categories={categories ?? []}
          onApply={(next) => {
            setFilters(next);
            reset();
          }}
          onClose={() => setFiltering(false)}
        />
      )}

      {mode === "new" && writableAccounts.length > 0 && (
        <NewTxSheet
          accounts={writableAccounts}
          categories={categories ?? []}
          initialAccountId={accountFilter || undefined}
          onSubmit={(values) => transactionActions.create(values)}
          onClose={() => setMode("none")}
        />
      )}

      {mode === "import" && writableAccounts.length > 0 && (
        <TxImportSheet
          accounts={writableAccounts}
          categories={categories ?? []}
          initialAccountId={accountFilter || importAccountId || undefined}
          onImported={(result) => {
            setImported(result);
            setMode("none");
          }}
          onClose={() => setMode("none")}
        />
      )}

      {recurringFor && (
        <MarkRecurringSheet
          source={recurringFor}
          categories={categories ?? []}
          onClose={() => setRecurringFor(null)}
          onDone={(result) => {
            setRecurringFor(null);
            setRecurringAdded(result);
          }}
        />
      )}

      <ConfirmDelete
        open={removeAll}
        onOpenChange={setRemoveAll}
        title={`Delete all transactions ${filteredAccount ? `on ${filteredAccount.name}` : "on your accounts"}?`}
        description="This cannot be undone and will reset the affected account balances."
        confirmLabel="Delete all"
        onConfirm={() => removeAllTransactions.mutate(accountFilter ? { accountId: accountFilter } : undefined)}
      />

      {recurringAdded && (
        <Toast
          onClose={() => setRecurringAdded(null)}
          actions={
            <>
              <Link href="/finance/budgets" onClick={() => setRecurringAdded(null)} className={toastPrimary}>
                View in Budgets
              </Link>
              <Button type="button" variant="ghost" onClick={() => setRecurringAdded(null)} className={toastSecondary}>
                Close
              </Button>
            </>
          }
        >
          <p className="font-semibold">✓ Added to recurring {recurringAdded.type === "INCOME" ? "income" : "expenses"}</p>
          <p className="mt-0.5 text-bg/75">{recurringAdded.name}</p>
        </Toast>
      )}

      {imported !== null && (
        <Toast
          onClose={() => setImported(null)}
          actions={
            <Button type="button" variant="ghost" onClick={() => setImported(null)} className={toastPrimary}>
              Done
            </Button>
          }
        >
          <p className="font-semibold">✓ {describeImport(imported).headline}</p>
          {describeImport(imported).detail && <p className="mt-0.5 text-bg/75">{describeImport(imported).detail}</p>}
        </Toast>
      )}
    </FinancePage>
  );
}
