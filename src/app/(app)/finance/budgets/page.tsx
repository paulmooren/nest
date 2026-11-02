"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { formatEUR, formatSignedEUR } from "@/lib/format";
import {
  HOUSEHOLD,
  YOU,
  entriesOf,
  monthlyOf,
  scopeOfOwner,
  totalsOf,
  type AccountRef,
  type Entry,
  type ScopeKey,
} from "@/lib/budget-scope";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetRow } from "@/components/finance/budget-row";
import { NO_ACCOUNT, type AccountOption, type FormValues, type Item, type Suggestion, type TxType } from "@/components/finance/budget-types";
import { AddGroup, ExpenseSections, type BudgetGroup } from "@/components/finance/expense-sections";
import { FinancePage } from "@/components/finance/finance-page";
import type { Member } from "@/components/finance/ownership-groups";
import { PaymentHistorySheet } from "@/components/finance/payment-history-sheet";
import { RecurringFormSheet } from "@/components/finance/recurring-form-sheet";
import { SuggestionsSheet } from "@/components/finance/suggestions-sheet";
import { useBudgetGroupActions, useRecurringActions } from "@/components/finance/use-recurring";
import { SortableList } from "@/components/sortable-list";
import { useDelayed } from "@/components/use-delayed";

export default function BudgetsPage() {
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();
  const { data: items } = trpc.recurring.list.useQuery();
  const members = useMemo<Member[]>(() => household?.members ?? [], [household]);
  const currentUserId = me?.id ?? "";

  const [scope, setScope] = useState<ScopeKey>(YOU);
  // The lists show one account at a time; until one is picked (or after a scope change) the first is shown.
  const [pickedAccount, setPickedAccount] = useState("");

  const accountRefs = useMemo(
    () => new Map<string, AccountRef>((accounts ?? []).map((a) => [a.id, { id: a.id, ownerId: a.ownerId, type: a.type }])),
    [accounts],
  );
  const entries = useMemo(
    () => ((items ?? []) as Item[]).flatMap((i) => entriesOf(i, accountRefs, currentUserId)),
    [items, accountRefs, currentUserId],
  );

  // The scopes you can look at: yours, the shared accounts, and any partner's accounts you may see.
  const scopes = useMemo(() => {
    const list: { key: ScopeKey; label: string }[] = [
      { key: YOU, label: "You" },
      { key: HOUSEHOLD, label: "Household" },
    ];
    for (const m of members) {
      if (m.user.id !== currentUserId) list.push({ key: m.user.id, label: m.user.name || m.user.email || "Partner" });
    }
    return list;
  }, [members, currentUserId]);
  const showScopes = members.length > 1;
  const activeScope = showScopes ? scope : YOU;

  const scopeEntries = entries.filter((e) => e.scope === activeScope);
  const scopeAccounts = (accounts ?? []).filter((a) => scopeOfOwner(a.ownerId, currentUserId) === activeScope);
  // Items that run through no account get their own chip, so one selection always covers every item.
  const hasUnlinked = scopeEntries.some((e) => !e.accountId);
  const accountFilter =
    pickedAccount === NO_ACCOUNT && hasUnlinked
      ? NO_ACCOUNT
      : (scopeAccounts.find((a) => a.id === pickedAccount)?.id ?? scopeAccounts[0]?.id ?? (hasUnlinked ? NO_ACCOUNT : ""));

  const showSkeleton = useDelayed(accounts === undefined || items === undefined);

  if (accounts === undefined || items === undefined) {
    return (
      <FinancePage>
        {showSkeleton && (
          <div role="status" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-11 w-full" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
      </FinancePage>
    );
  }

  const { left } = totalsOf(scopeEntries);
  const changed = new Set(scopeEntries.filter((e) => (e.item as Item).proposal !== null).map((e) => e.item.id)).size;
  const hasItems = items.length > 0;

  return (
    <FinancePage>
      <section aria-label="Left each month" className="flex flex-col gap-3">
        <p className={cn("font-heading text-5xl leading-none font-bold tracking-tight tabular-nums", left < 0 ? "text-destructive" : "text-success")}>
          {hasItems ? formatSignedEUR(left).replace(/^\+/, "") : formatEUR(0)}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasItems
            ? "left each month after fixed costs"
            : "Add your recurring income and expenses below, or confirm the suggestions, to see what is left each month."}
        </p>
        {showScopes && (
          <ChoiceChips
            label="Whose budget"
            value={activeScope}
            onChange={(key) => {
              setScope(key);
              setPickedAccount("");
            }}
            options={scopes.map((s) => ({ value: s.key, label: s.label }))}
          />
        )}
        {changed > 0 && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => document.querySelector("[data-proposal]")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            {changed} amount{changed === 1 ? "" : "s"} changed — review
          </Button>
        )}
      </section>

      {(scopeAccounts.length > 0 || hasUnlinked) && (
        <ChoiceChips
          label="Account"
          value={accountFilter}
          onChange={setPickedAccount}
          options={[
            ...scopeAccounts.map((a) => ({ value: a.id, label: a.name })),
            ...(hasUnlinked ? [{ value: NO_ACCOUNT, label: "No account" }] : []),
          ]}
        />
      )}

      <RecurringItems
        members={members}
        currentUserId={currentUserId}
        accounts={accounts as AccountOption[]}
        accountFilter={accountFilter}
        scopeEntries={scopeEntries as Entry<Item>[]}
        scope={activeScope}
      />
    </FinancePage>
  );
}

function RecurringItems({
  members,
  currentUserId,
  accounts,
  accountFilter,
  scopeEntries,
  scope,
}: {
  members: Member[];
  currentUserId: string;
  accounts: AccountOption[];
  accountFilter: string;
  scopeEntries: Entry<Item>[];
  scope: ScopeKey;
}) {
  const { data: suggestions } = trpc.recurring.suggestions.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: allItems } = trpc.recurring.list.useQuery();
  const { data: budgetGroups } = trpc.budgetGroup.list.useQuery();
  const groups: BudgetGroup[] = budgetGroups ?? [];
  const usedGroupIds = useMemo(
    () => new Set((allItems ?? []).map((i) => i.budgetGroupId).filter((id): id is string => !!id)),
    [allItems],
  );

  const recurring = useRecurringActions();
  const groupActions = useBudgetGroupActions();

  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<"INCOME" | "EXPENSE" | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "another account";

  const shown = scopeEntries.filter((e) => !accountFilter || e.accountId === accountFilter);
  const income = shown.filter((e) => e.side === "INCOME");
  const expenses = shown.filter((e) => e.side === "EXPENSE");
  const monthlyIncome = income.reduce((sum, e) => sum + monthlyOf(e.item), 0);
  const monthlyExpenses = expenses.reduce((sum, e) => sum + monthlyOf(e.item), 0);

  const mine = (suggestions ?? []).filter(
    (c) => scopeOfOwner(c.ownerId, currentUserId) === scope && (!accountFilter || (accountFilter !== NO_ACCOUNT && c.accountId === accountFilter)),
  ) as Suggestion[];

  const editingItem = (allItems as Item[] | undefined)?.find((i) => i.id === editing);
  const canEditItem = (i: Item) => i.ownerId === null || i.ownerId === currentUserId;

  const renderRow = (entry: Entry<Item>) => {
    const item = entry.item;
    const transferText =
      item.type === "TRANSFER"
        ? entry.side === "EXPENSE"
          ? `Transfer to ${accountName(item.toAccountId)}`
          : `Transfer from ${accountName(item.accountId)}`
        : null;
    return (
      <BudgetRow
        key={`${item.id}-${entry.side}`}
        item={item}
        transferText={transferText}
        canEdit={canEditItem(item)}
        onOpen={() => setEditing(item.id)}
        onAcceptProposal={() => recurring.acceptProposal({ id: item.id })}
        onKeepAmount={() => recurring.keepAmount({ id: item.id })}
      />
    );
  };

  const column = (type: "INCOME" | "EXPENSE", title: string, total: number, list: Entry<Item>[]) => (
    <Section
      key={type}
      title={title}
      description={undefined}
      className="gap-3"
    >
      <p className="-mt-3 text-sm text-muted-foreground tabular-nums">
        <span className={cn("font-heading text-2xl font-bold tracking-tight", type === "INCOME" ? "text-success" : "text-foreground")}>
          {formatEUR(total)}
        </span>{" "}
        / month
      </p>
      {list.length === 0 && <EmptyState title={`Nothing here yet — add ${type === "INCOME" ? "income" : "an expense"} below.`} />}
      {type === "EXPENSE" ? (
        <ExpenseSections
          entries={list}
          groups={groups}
          usedGroupIds={usedGroupIds}
          hostsFresh
          renderRow={renderRow}
          onReorder={(ids) => recurring.reorder({ ids })}
          onMove={({ id, groupId, ids }) => recurring.reorder({ ids, move: { id, groupId } })}
          onRename={groupActions.rename}
          onDelete={groupActions.remove}
        />
      ) : (
        list.length > 0 && (
          <SortableList ids={list.map((e) => e.item.id)} onReorder={(ids) => recurring.reorder({ ids })}>
            <RowList>{list.map(renderRow)}</RowList>
          </SortableList>
        )
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setAdding(type)}>
          <PlusIcon /> Add {type === "INCOME" ? "income" : "expense"}
        </Button>
        {type === "EXPENSE" && <AddGroup onAdd={groupActions.create} />}
      </div>
    </Section>
  );

  return (
    <>
      {mine.length > 0 && (
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-muted"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium md:text-sm">
              {mine.length} recurring item{mine.length === 1 ? "" : "s"} found
            </span>
            <span className="block text-sm text-muted-foreground md:text-xs">Review suggestions from your transactions</span>
          </span>
          <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
        </button>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {column("INCOME", "Income", monthlyIncome, income)}
        {column("EXPENSE", "Expenses", monthlyExpenses, expenses)}
      </div>

      {reviewing && (
        <SuggestionsSheet
          suggestions={mine}
          onDismiss={(matchKey) => recurring.dismissSuggestions({ matchKeys: [matchKey] })}
          onClose={() => setReviewing(false)}
        />
      )}

      {adding && (
        <RecurringFormSheet
          type={adding}
          groups={groups}
          categories={categories ?? []}
          members={members}
          currentUserId={currentUserId}
          accounts={accounts}
          defaultAccountId={accountFilter === NO_ACCOUNT ? "" : accountFilter}
          onSubmit={(values: FormValues) => recurring.create({ ...values, type: adding as TxType })}
          onClose={() => setAdding(null)}
        />
      )}

      {editingItem && (
        <RecurringFormSheet
          initial={editingItem}
          type={editingItem.type}
          groups={groups}
          categories={categories ?? []}
          members={members}
          currentUserId={currentUserId}
          accounts={accounts}
          canEdit={canEditItem(editingItem)}
          onSubmit={(values) => {
            // Only a changed amount counts as typing one (which makes the item Fixed); a rename or new schedule must not.
            const { amount, ...rest } = values;
            recurring.update({ id: editingItem.id, ...(amount === editingItem.amount ? rest : values) });
          }}
          onHistory={editingItem.paymentCount > 0 ? () => {
            setEditing(null);
            setHistory(editingItem.id);
          } : undefined}
          onDelete={() => {
            setEditing(null);
            setDeleting(editingItem);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {history && <PaymentHistorySheet itemId={history} onClose={() => setHistory(null)} />}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="Its payments stay as transactions."
        onConfirm={() => deleting && recurring.remove({ id: deleting.id })}
      />
    </>
  );
}
