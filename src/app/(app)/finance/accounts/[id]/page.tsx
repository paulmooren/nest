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
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { AccountSheet } from "@/components/finance/account-sheet";
import { ibanProblem, useAccountActions } from "@/components/finance/use-accounts";
import { TxRows, TxSheet, type Tx } from "@/components/finance/tx-list";
import { useCategoryAssign } from "@/components/finance/use-category-assign";
import { useTransactionActions } from "@/components/finance/use-transactions";

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

  const account = accounts?.find((a) => a.id === accountId);
  const canEdit = account ? account.ownerId === null || account.ownerId === me?.id : false;
  const members = household?.members ?? [];
  const openedTx: Tx | undefined = transactions?.find((t) => t.id === openTx);

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
          {transactions?.length === 0 ? (
            <EmptyState title="No transactions yet." />
          ) : (
            transactions && <TxRows transactions={transactions} accountId={accountId} onOpen={(t) => setOpenTx(t.id)} />
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
