"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { formatEUR, formatSignedEUR } from "@/lib/format";
import {
  HOUSEHOLD,
  YOU,
  entriesOf,
  scopeOfOwner,
  totalsOf,
  type AccountRef,
  type Entry,
  type ScopeKey,
} from "@/lib/budget-scope";
import { describeImport, type ImportResult } from "@/lib/statement-import";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddChip, ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSheet } from "@/components/finance/add-sheet";
import { AccountSheet } from "@/components/finance/account-sheet";
import { AccountSection, isAssetType, type AccountSummary } from "@/components/finance/account-section";
import { BudgetRow } from "@/components/finance/budget-row";
import { NO_ACCOUNT, type AccountOption, type FormValues, type Item, type Suggestion, type TxType } from "@/components/finance/budget-types";
import type { BudgetGroup } from "@/components/finance/expense-sections";
import { FinancePage } from "@/components/finance/finance-page";
import type { Member } from "@/components/finance/ownership-groups";
import { PaymentHistorySheet } from "@/components/finance/payment-history-sheet";
import { RecurringFormSheet } from "@/components/finance/recurring-form-sheet";
import { SuggestionsSheet } from "@/components/finance/suggestions-sheet";
import { TxImportSheet } from "@/components/finance/tx-import-sheet";
import { AFTER_ACCOUNT_CREATED } from "@/components/finance/use-accounts";
import { useBudgetGroupActions, useRecurringActions } from "@/components/finance/use-recurring";
import { Toast, toastPrimary } from "@/components/toast";
import { useDelayed } from "@/components/use-delayed";

export default function BudgetsPage() {
  return (
    <Suspense>
      <Budgets />
    </Suspense>
  );
}

function Budgets() {
  const refresh = useRefresh();
  const importParam = useSearchParams().get("import");

  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();
  const { data: items } = trpc.recurring.list.useQuery();
  const suggestionsQuery = trpc.recurring.suggestions.useQuery();
  const suggestions = suggestionsQuery.data;
  const { data: categories } = trpc.category.list.useQuery();
  const { data: budgetGroups } = trpc.budgetGroup.list.useQuery();
  const members = useMemo<Member[]>(() => household?.members ?? [], [household]);
  const currentUserId = me?.id ?? "";

  const recurring = useRecurringActions();
  const groupActions = useBudgetGroupActions();
  // A new account waits for the server (it works out the balance and the net worth), so its sheet shows it is busy.
  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => {
      refresh(...AFTER_ACCOUNT_CREATED);
      setCreatingAccount(false);
    },
  });

  // A link from the Inbox can open the Household's scope; otherwise it opens on You.
  const scopeParam = useSearchParams().get("scope");
  const [scope, setScope] = useState<ScopeKey>(scopeParam === HOUSEHOLD ? HOUSEHOLD : YOU);
  // Which accounts are opened; an account never touched follows the default (the first, or one with an amount to review).
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  // The one add action of the page: first a choice (type one in, or import a statement), then the form or the import.
  // A link from Today goes straight to the import of one account.
  const [adding, setAdding] = useState<{ step: "choose" | "type" | "import"; accountId: string } | null>(
    importParam ? { step: "import", accountId: importParam } : null,
  );
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  // Set by an import until the Suggestions have refreshed; then it goes straight into reviewing them.
  const [awaitingReview, setAwaitingReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

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

  const usedGroupIds = useMemo(
    () => new Set((items ?? []).map((i) => i.budgetGroupId).filter((id): id is string => !!id)),
    [items],
  );

  const suggestionCount = (suggestions ?? []).filter((c) => scopeOfOwner(c.ownerId, currentUserId) === activeScope).length;
  const importSettled = awaitingReview && !suggestionsQuery.isFetching;

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

  const scopeEntries = entries.filter((e) => e.scope === activeScope) as Entry<Item>[];
  const scopeAccounts = accounts.filter((a) => scopeOfOwner(a.ownerId, currentUserId) === activeScope);
  const unlinked = scopeEntries.filter((e) => !e.accountId);
  const groups: BudgetGroup[] = budgetGroups ?? [];

  const { left } = totalsOf(scopeEntries);
  const changed = new Set(scopeEntries.filter((e) => e.item.proposal !== null).map((e) => e.item.id)).size;
  const hasItems = items.length > 0;

  const mine = (suggestions ?? []).filter((c) => scopeOfOwner(c.ownerId, currentUserId) === activeScope) as Suggestion[];
  const writableAccounts = accounts.filter((a) => a.ownerId === null || a.ownerId === currentUserId);

  const closeImported = () => {
    setImported(null);
    setAwaitingReview(false);
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "another account";
  const editingItem = (items as Item[]).find((i) => i.id === editing);
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
        compact
        onOpen={() => setEditing(item.id)}
        onAcceptProposal={() => recurring.acceptProposal({ id: item.id })}
        onKeepAmount={() => recurring.keepAmount({ id: item.id })}
      />
    );
  };

  const firstId = scopeAccounts.find((a) => isAssetType(a.type))?.id ?? scopeAccounts[0]?.id;
  const isOpen = (id: string) =>
    opened[id] ?? (scopeEntries.some((e) => (e.accountId ?? NO_ACCOUNT) === id && e.item.proposal !== null) || id === firstId);
  // What the add sheet starts on: the one account that is opened, else the first (only if it is yours to edit).
  const openIds = scopeAccounts.filter((a) => isOpen(a.id)).map((a) => a.id);
  const startId = openIds.length === 1 ? openIds[0] : (firstId ?? "");
  const startAccountId = writableAccounts.some((a) => a.id === startId) ? startId : "";
  const section = (account: AccountSummary | null) => {
    const id = account?.id ?? NO_ACCOUNT;
    const own = scopeEntries.filter((e) => (account ? e.accountId === account.id : !e.accountId));
    return (
      <AccountSection
        key={id}
        account={account}
        entries={own}
        open={isOpen(id)}
        onToggle={() => setOpened((o) => ({ ...o, [id]: !isOpen(id) }))}
        groups={groups}
        usedGroupIds={usedGroupIds}
        renderRow={renderRow}
        onReorder={(ids) => recurring.reorder({ ids })}
        onMove={({ id: itemId, groupId, ids }) => recurring.reorder({ ids, move: { id: itemId, groupId } })}
        onRenameGroup={groupActions.rename}
        onDeleteGroup={groupActions.remove}
      />
    );
  };

  const group = (title: string, list: typeof scopeAccounts) =>
    list.length > 0 && (
      <Section title={title} className="gap-3">
        <RowList className="md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">{list.map((a) => section(a))}</RowList>
      </Section>
    );

  return (
    <FinancePage
      actions={
        <Button onClick={() => setAdding({ step: "choose", accountId: startAccountId })}>
          <PlusIcon /> Add
        </Button>
      }
    >
      <section aria-label="Left each month" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
          <div className="flex flex-col gap-3">
            <p className={cn("font-heading text-5xl leading-none font-bold tracking-tight tabular-nums", left < 0 ? "text-destructive" : "text-success")}>
              {hasItems ? formatSignedEUR(left).replace(/^\+/, "") : formatEUR(0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasItems
                ? "left each month after fixed costs"
                : "Add your recurring income and expenses below, or import a statement to find them with the Add button, to see what is left each month."}
            </p>
          </div>
        </div>
        {showScopes && (
          <ChoiceChips
            label="Whose budget"
            value={activeScope}
            onChange={setScope}
            options={scopes.map((s) => ({ value: s.key, label: s.label }))}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          {changed > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => document.querySelector("[data-proposal]")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              {changed} amount{changed === 1 ? "" : "s"} changed — review
            </Button>
          )}
        </div>
      </section>

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

      {scopeAccounts.length === 0 && unlinked.length === 0 && (
        <EmptyState title="No accounts yet. Add your first one." action={<Button onClick={() => setCreatingAccount(true)}>Add account</Button>} />
      )}
      {group("Assets", scopeAccounts.filter((a) => isAssetType(a.type)))}
      {group("Liabilities", scopeAccounts.filter((a) => !isAssetType(a.type)))}
      {unlinked.length > 0 && (
        <Section title="No account" className="gap-3">
          <RowList className="md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">{section(null)}</RowList>
        </Section>
      )}
      {scopeAccounts.length > 0 && (
        <div className="self-start">
          <AddChip onClick={() => setCreatingAccount(true)}>Account</AddChip>
        </div>
      )}

      {(reviewing || (importSettled && suggestionCount > 0)) && (
        <SuggestionsSheet
          suggestions={mine}
          onDismiss={(matchKey) => recurring.dismissSuggestions({ matchKeys: [matchKey] })}
          onClose={() => {
            setReviewing(false);
            setAwaitingReview(false);
          }}
        />
      )}

      {adding?.step === "choose" && (
        <AddSheet
          canImport={writableAccounts.length > 0}
          onType={() => setAdding({ ...adding, step: "type" })}
          onImport={() => setAdding({ ...adding, step: "import" })}
          onClose={() => setAdding(null)}
        />
      )}

      {adding?.step === "type" && (
        <RecurringFormSheet
          type="EXPENSE"
          groups={groups}
          categories={categories ?? []}
          members={members}
          currentUserId={currentUserId}
          accounts={accounts as AccountOption[]}
          defaultAccountId={adding.accountId}
          onSubmit={(values: FormValues, kind: TxType) => recurring.create({ ...values, type: kind })}
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
          accounts={accounts as AccountOption[]}
          canEdit={canEditItem(editingItem)}
          onSubmit={(values) => {
            // Only a changed amount counts as typing one (which makes the item Fixed); a rename or new schedule must not.
            const { amount, ...rest } = values;
            recurring.update({ id: editingItem.id, ...(amount === editingItem.amount ? rest : values) });
          }}
          onHistory={
            editingItem.paymentCount > 0
              ? () => {
                  setEditing(null);
                  setHistory(editingItem.id);
                }
              : undefined
          }
          onDelete={() => {
            setEditing(null);
            setDeleting(editingItem);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {history && <PaymentHistorySheet itemId={history} onClose={() => setHistory(null)} />}

      {creatingAccount && (
        <AccountSheet
          members={members}
          currentUserId={currentUserId}
          pending={createAccount.isPending}
          error={createAccount.error?.message}
          onSubmit={(values) => createAccount.mutate(values)}
          onClose={() => setCreatingAccount(false)}
        />
      )}

      {adding?.step === "import" && writableAccounts.length > 0 && (
        <TxImportSheet
          accounts={writableAccounts}
          categories={categories ?? []}
          initialAccountId={adding.accountId || undefined}
          onImported={(result) => {
            setImported(result);
            setAwaitingReview(true);
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="Its payments stay as transactions."
        onConfirm={() => deleting && recurring.remove({ id: deleting.id })}
      />

      {imported !== null && (
        <Toast
          onClose={closeImported}
          actions={
            <Button type="button" variant="ghost" onClick={closeImported} className={toastPrimary}>
              Done
            </Button>
          }
        >
          <p className="font-semibold">✓ {describeImport(imported).headline}</p>
          {describeImport(imported).detail && <p className="mt-0.5 text-background/75">{describeImport(imported).detail}</p>}
          {importSettled && suggestionCount === 0 && <p className="mt-0.5 text-background/75">No new recurring items found.</p>}
        </Toast>
      )}
    </FinancePage>
  );
}
