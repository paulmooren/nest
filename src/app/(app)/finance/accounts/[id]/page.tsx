"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";
import { BalanceChart, type BalancePoint, type Granularity } from "@/components/balance-chart";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { ListTools } from "@/components/ui/list-tools";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { AccountSheet } from "@/components/finance/account-sheet";
import { ibanProblem, useAccountActions } from "@/components/finance/use-accounts";
import { TxRows, TxSheet, type Tx } from "@/components/finance/tx-list";
import { useCategoryAssign } from "@/components/finance/use-category-assign";
import { useTransactionActions } from "@/components/finance/use-transactions";

type TxSort = "newest" | "oldest" | "largest" | "smallest";
const SORTS: { value: TxSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "largest", label: "Largest amount" },
  { value: "smallest", label: "Smallest amount" },
];
const when = (t: Tx) => new Date(t.date).getTime();
// The list arrives newest first, so only the other three orders need working out.
const BY: Record<Exclude<TxSort, "newest">, (a: Tx, b: Tx) => number> = {
  oldest: (a, b) => when(a) - when(b),
  largest: (a, b) => Number(b.amount) - Number(a.amount) || when(b) - when(a),
  smallest: (a, b) => Number(a.amount) - Number(b.amount) || when(b) - when(a),
};

function BackLink() {
  return (
    <Link
      href="/finance/budgets"
      className="-mt-2 mb-2 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" aria-hidden />
      Budget
    </Link>
  );
}

export default function AccountDetailPage() {
  const router = useRouter();
  const { id: accountId } = useParams<{ id: string }>();

  const { data: accounts } = trpc.account.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: transactions } = trpc.transaction.list.useQuery({ limit: 200, accountId });
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();

  const [range, setRange] = useState<{ from: Date; to: Date; granularity: Granularity } | null>(null);
  const { data: history } = trpc.dashboard.accountHistory.useQuery(
    { accountId, from: range?.from ?? new Date(), to: range?.to ?? new Date(), granularity: range?.granularity ?? "day" },
    { enabled: !!range },
  );
  const data: BalancePoint[] | undefined = useMemo(() => history?.map((h) => ({ date: h.date, value: h.balance })), [history]);

  const { assign: assignCategory, toast: categoryToast } = useCategoryAssign(categories ?? []);
  const transactionActions = useTransactionActions();
  const accountActions = useAccountActions();

  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [openTx, setOpenTx] = useState<string | null>(null);
  const [kind, setKind] = useState("any");
  const [categoryId, setCategoryId] = useState("any");
  const [sort, setSort] = useState<TxSort>("newest");
  const [query, setQuery] = useState<string | null>(null);

  const account = accounts?.find((a) => a.id === accountId);
  const canEdit = account ? account.ownerId === null || account.ownerId === me?.id : false;
  const members = household?.members ?? [];
  const openedTx: Tx | undefined = transactions?.find((t) => t.id === openTx);

  // Only the categories this account's transactions use are offered, plus "No category" when some have none.
  const used = new Map<string, string>();
  for (const t of transactions ?? []) if (t.category) used.set(t.category.id, t.category.name);
  const someUncategorised = (transactions ?? []).some((t) => t.type !== "TRANSFER" && !t.categoryId);
  const q = (query ?? "").trim().toLowerCase();
  const narrowed = kind !== "any" || categoryId !== "any" || q !== "";
  const matching = (transactions ?? []).filter(
    (t) =>
      (kind === "any" || t.type === kind) &&
      (categoryId === "any" || (categoryId === "none" ? t.type !== "TRANSFER" && !t.categoryId : t.categoryId === categoryId)) &&
      (!q || [t.merchant, t.note ?? "", t.category?.name ?? ""].some((text) => text.toLowerCase().includes(q))),
  );
  const shownTx = sort === "newest" ? matching : [...matching].sort(BY[sort]);

  if (accounts && !account) {
    return (
      <>
        <BackLink />
        <EmptyState title="Account not found." />
      </>
    );
  }

  const owner = account?.ownerId ? members.find((m) => m.user.id === account.ownerId) : undefined;
  const whose = !account ? "" : account.ownerId === null ? "Shared" : account.ownerId === me?.id ? "Personal" : `${owner?.user.name || owner?.user.email}'s`;

  return (
    <>
      {categoryToast}
      <BackLink />
      <PageHeader
        title={account?.name ?? "Account"}
        description={account ? `${account.institution || ACCOUNT_TYPE_LABELS[account.type as AccountType]} · ${whose}` : undefined}
        actions={
          canEdit ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon /> Edit
            </Button>
          ) : undefined
        }
      />
      <PageBody>
        {account && account.ownerId !== null && !account.visibleToHousehold && (
          <p className="text-sm text-muted-foreground">Private — your household can’t see this account.</p>
        )}

        <BalanceChart label="Balance" data={data} currentValue={account ? Number(account.balance) : 0} onRangeChange={setRange} />

        <Section title="Transactions">
          {transactions && transactions.length > 0 && (
            <ListTools
              count={shownTx.length}
              noun={["transaction", "transactions"]}
              filters={[
                {
                  key: "kind",
                  label: "Kind",
                  value: kind,
                  any: "any",
                  options: [
                    { value: "any", label: "Everything" },
                    { value: "INCOME", label: "Income" },
                    { value: "EXPENSE", label: "Expenses" },
                    { value: "TRANSFER", label: "Transfers" },
                  ],
                },
                {
                  key: "category",
                  label: "Category",
                  value: categoryId,
                  any: "any",
                  options: [
                    { value: "any", label: "Any category" },
                    ...[...used].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })),
                    ...(someUncategorised ? [{ value: "none", label: "No category" }] : []),
                  ],
                },
              ]}
              onFilter={(key, value) => (key === "kind" ? setKind(value) : setCategoryId(value))}
              sort={{ value: sort, initial: "newest", options: SORTS, onChange: setSort }}
              query={query}
              onQuery={setQuery}
              searchPlaceholder="Search transactions"
            />
          )}
          {transactions?.length === 0 ? (
            <EmptyState title="No transactions yet." />
          ) : transactions && shownTx.length === 0 ? (
            <EmptyState title={narrowed ? "No transaction matches the filter or the search." : "No transactions yet."} />
          ) : (
            transactions && <TxRows transactions={shownTx} accountId={accountId} onOpen={(t) => setOpenTx(t.id)} />
          )}
        </Section>
      </PageBody>

      {openedTx && (
        <TxSheet
          tx={openedTx}
          accountId={accountId}
          categories={categories ?? []}
          canEdit={canEdit}
          onCategory={(categoryId) => void assignCategory(openedTx.id, categoryId)}
          onDelete={() => transactionActions.remove(openedTx.id)}
          onClose={() => setOpenTx(null)}
        />
      )}

      {editing && account && (
        <AccountSheet
          initial={account}
          members={members}
          currentUserId={me?.id ?? ""}
          error={editError}
          onSubmit={(values) => {
            // What the server would refuse is said here, before the sheet closes.
            const problem = ibanProblem(values.iban, accounts!.filter((a) => a.id !== account.id));
            if (problem) return setEditError(problem);
            accountActions.update.mutate({ id: account.id, ...values });
            setEditing(false);
            setEditError(undefined);
          }}
          onClose={() => {
            setEditing(false);
            setEditError(undefined);
          }}
        />
      )}
      {canEdit && account && (
        <div className="mt-10">
          <Button variant="ghost" className="text-destructive" onClick={() => setDeleting(true)}>
            Delete account
          </Button>
        </div>
      )}
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete "${account?.name ?? ""}"?`}
        description="Its transactions are deleted with it."
        onConfirm={() => {
          if (!account) return;
          accountActions.remove.mutate({ id: account.id });
          router.push("/finance/budgets");
        }}
      />
    </>
  );
}
