"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { ACCOUNT_TYPE_LABELS, ASSET_ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Row, RowList } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSheet } from "@/components/finance/account-sheet";
import { FinancePage } from "@/components/finance/finance-page";
import { groupLabel, groupOrder, type Member } from "@/components/finance/ownership-groups";
import { AFTER_ACCOUNT_CREATED } from "@/components/finance/use-accounts";
import { formatEUR } from "@/lib/format";
import { useDelayed } from "@/components/use-delayed";

export default function AccountsPage() {
  const refresh = useRefresh();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();
  const [creating, setCreating] = useState(false);
  const showSkeleton = useDelayed(accounts === undefined);

  // A new account waits for the server (it works out the balance and the net worth), so its sheet shows it is busy.
  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => {
      refresh(...AFTER_ACCOUNT_CREATED);
      setCreating(false);
    },
  });

  const members: Member[] = household?.members ?? [];
  const currentUserId = me?.id ?? "";
  const isAsset = (type: string) => (ASSET_ACCOUNT_TYPES as readonly string[]).includes(type);

  const group = (title: string, list: NonNullable<typeof accounts>) =>
    list.length > 0 && (
      <section key={title} aria-label={title} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {groupOrder(members, currentUserId)
          .filter((ownerId) => list.some((a) => a.ownerId === ownerId))
          .map((ownerId) => (
            <div key={ownerId ?? "shared"} className="flex flex-col gap-2">
              {members.length > 1 && (
                <h3 className="text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                  {groupLabel(ownerId, members, currentUserId)}
                </h3>
              )}
              <RowList>
                {list
                  .filter((a) => a.ownerId === ownerId)
                  .map((a) => {
                    const liability = !isAsset(a.type);
                    const balance = Number(a.balance);
                    return (
                      <Row
                        key={a.id}
                        href={`/finance/accounts/${a.id}`}
                        leading={
                          <span className="flex size-9 items-center justify-center rounded-[10px] border bg-muted text-muted-foreground">
                            <span className="block size-4">
                              <AccountTypeIcon type={a.type} />
                            </span>
                          </span>
                        }
                        title={a.name}
                        meta={a.institution || ACCOUNT_TYPE_LABELS[a.type as AccountType]}
                        trailing={
                          <span className="font-semibold">
                            {liability ? "−" : ""}
                            {formatEUR(Math.abs(balance))}
                          </span>
                        }
                        chevron
                      />
                    );
                  })}
              </RowList>
            </div>
          ))}
      </section>
    );

  return (
    <FinancePage
      actions={
        <Button onClick={() => setCreating(true)}>
          <PlusIcon /> Account
        </Button>
      }
    >
      {accounts === undefined ? (
        showSkeleton && (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading…</span>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )
      ) : accounts.length === 0 ? (
        <EmptyState title="No accounts yet. Add your first one." action={<Button onClick={() => setCreating(true)}>Add account</Button>} />
      ) : (
        <>
          {group("Assets", accounts.filter((a) => isAsset(a.type)))}
          {group("Liabilities", accounts.filter((a) => !isAsset(a.type)))}
        </>
      )}

      {creating && (
        <AccountSheet
          members={members}
          currentUserId={currentUserId}
          pending={createAccount.isPending}
          error={createAccount.error?.message}
          onSubmit={(values) => createAccount.mutate(values)}
          onClose={() => setCreating(false)}
        />
      )}
    </FinancePage>
  );
}
