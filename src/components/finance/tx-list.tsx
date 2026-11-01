"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { AmountText } from "@/components/ds/amount-text";
import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { ConfirmDelete } from "@/components/ds/confirm-delete";
import { Field } from "@/components/ds/field";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { Row, RowList } from "@/components/ds/row";
import { RepeatIcon } from "lucide-react";
import { TRANSFER_COLOR } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export type Tx = inferRouterOutputs<AppRouter>["transaction"]["list"][number];
export type TxCategory = { id: string; name: string; color: string };

/**
 * How a transaction reads from one account's point of view: the signed amount, its colour bar and its label. With
 * no `accountId` it is the household's view (a transfer is just a transfer).
 */
export function describeTx(t: Tx, accountId?: string) {
  const outgoing = t.type === "TRANSFER" && accountId !== undefined && t.accountId === accountId;
  const incoming = t.type === "TRANSFER" && accountId !== undefined && t.transferToAccountId === accountId;
  const inflow = t.type === "INCOME" || incoming;
  const label = outgoing
    ? `Transfer to ${t.transferToAccount?.name ?? "another account"}`
    : incoming
      ? `Transfer from ${t.account?.name ?? "another account"}`
      : t.merchant;
  const color = t.type === "TRANSFER" ? TRANSFER_COLOR : (t.category?.color ?? "#c7c9cf");
  const value = t.type === "TRANSFER" && accountId === undefined ? Number(t.amount) : (inflow ? 1 : -1) * Number(t.amount);
  return { label, color, value, signed: t.type !== "TRANSFER" || accountId !== undefined };
}

/** Transactions as rows: colour dot, merchant, one meta line, signed amount. Tapping a row opens its sheet. */
export function TxRows({
  transactions,
  accountId,
  showAccount,
  showDate = true,
  isRecurring,
  onOpen,
}: {
  transactions: Tx[];
  accountId?: string;
  /** Name the account in the meta line, for lists that mix accounts. */
  showAccount?: boolean;
  /** Off when a heading above the rows already says the day. */
  showDate?: boolean;
  /** Which rows belong to a recurring item; they get a small repeat mark. */
  isRecurring?: (tx: Tx) => boolean;
  onOpen: (tx: Tx) => void;
}) {
  return (
    <RowList>
      {transactions.map((t) => {
        const d = describeTx(t, accountId);
        const meta = [
          showDate ? formatDate(t.date) : undefined,
          t.type === "TRANSFER" ? "Transfer" : (t.category?.name ?? "No category"),
          showAccount ? t.account?.name : undefined,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Row
            key={t.id}
            leading={<span className="block size-3 rounded-full" style={{ background: d.color }} aria-hidden />}
            title={
              isRecurring?.(t) ? (
                <span className="inline-flex items-center gap-1.5">
                  {d.label}
                  <RepeatIcon className="size-3.5 text-success" role="img" aria-label="Recurring" />
                </span>
              ) : (
                d.label
              )
            }
            meta={meta}
            trailing={<AmountText value={d.value} signed={d.signed} className="font-semibold" />}
            onClick={() => onOpen(t)}
          />
        );
      })}
    </RowList>
  );
}

/** One transaction: what it is, its category (for people who can edit it), and delete. */
export function TxSheet({
  tx,
  accountId,
  categories,
  canEdit,
  onCategory,
  onMarkRecurring,
  recurringText,
  onDelete,
  onClose,
}: {
  tx: Tx;
  accountId?: string;
  categories: TxCategory[];
  canEdit: boolean;
  onCategory: (categoryId: string | null) => void;
  /** Offered when the transaction is not part of a recurring item yet. */
  onMarkRecurring?: () => void;
  /** Set when it is: "Recurring · every month". */
  recurringText?: string | null;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const d = describeTx(tx, accountId);
  const isTransfer = tx.type === "TRANSFER";

  return (
    <>
      <ResponsiveSheet open={!confirming} onOpenChange={(o) => !o && onClose()} title={d.label}>
        <div className="flex flex-col gap-5">
          <div>
            <AmountText value={d.value} signed={d.signed} className="font-heading text-3xl font-bold tracking-tight" />
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(tx.date)} · {tx.account?.name}
            </p>
          </div>
          {!isTransfer && (
            <Field id="tx-category" label="Category">
              {canEdit ? (
                <ChoiceChips
                  label="Category"
                  value={tx.categoryId ?? "none"}
                  onChange={(v) => onCategory(v === "none" ? null : v)}
                  options={[
                    { value: "none", label: "None" },
                    ...categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      leading: <span className="block size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />,
                    })),
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{tx.category?.name ?? "No category"}</p>
              )}
            </Field>
          )}
          {tx.note && <p className="text-sm text-muted-foreground">{tx.note}</p>}
          {recurringText && <p className="text-sm text-success">{recurringText}</p>}
          {canEdit && !recurringText && onMarkRecurring && (
            <Button variant="outline" className="self-start" onClick={onMarkRecurring}>
              <RepeatIcon /> Mark as recurring
            </Button>
          )}
          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={onClose}>
              Done
            </Button>
            {canEdit && (
              <Button variant="outline" size="lg" className="text-destructive" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </ResponsiveSheet>
      <ConfirmDelete
        open={confirming}
        onOpenChange={(o) => {
          setConfirming(o);
          if (!o) onClose();
        }}
        title="Delete this transaction?"
        description={`${d.label} on ${formatDate(tx.date)}.`}
        onConfirm={onDelete}
      />
    </>
  );
}
