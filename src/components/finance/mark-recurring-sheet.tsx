"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { cleanMerchant } from "@/lib/csv";
import { formatEUR } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { SCHEDULE_UNITS, unitLabel, type ScheduleUnit } from "@/lib/schedule";
import { Button } from "@/components/ds/button";
import { Field } from "@/components/ds/field";
import { Input } from "@/components/ds/input";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ds/select";
import { TextField } from "@/components/ds/text-field";
import { useRecurringActions } from "@/components/finance/use-recurring";

export type RecurringSource = {
  id: string;
  merchant: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
  date: Date | string;
  categoryId: string | null;
  accountId: string;
  accountName: string;
  /** For a transfer: where the money arrives. */
  toAccountId?: string | null;
  toAccountName?: string;
};

/**
 * "This repeats": turns a transaction into a recurring income or expense, prefilled from it — name, amount,
 * category, and the account it runs through. The merchant text is remembered so the same transaction isn't
 * suggested again, and the transaction's date is the starting point for the next due date.
 */
export function MarkRecurringSheet({
  source,
  categories,
  onClose,
  onDone,
}: {
  source: RecurringSource;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onDone: (result: { name: string; type: "EXPENSE" | "INCOME" | "TRANSFER" }) => void;
}) {
  const utils = trpc.useUtils();
  const recurring = useRecurringActions();
  const isIncome = source.type === "INCOME";
  const isTransfer = source.type === "TRANSFER";
  const [name, setName] = useState(isTransfer ? `Transfer to ${source.toAccountName ?? "another account"}` : cleanMerchant(source.merchant));
  const [amount, setAmount] = useState(source.amount.toFixed(2));
  const [count, setCount] = useState("1");
  const [unit, setUnit] = useState<ScheduleUnit>("MONTH");
  const [categoryId, setCategoryId] = useState(source.categoryId ?? "");
  const [error, setError] = useState<string | null>(null);
  const n = Math.max(1, Math.min(365, Math.round(Number(count) || 1)));
  const categoryItems = [{ value: "", label: "No category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isTransfer ? "Mark as recurring transfer" : isIncome ? "Mark as recurring income" : "Mark as recurring expense"}
      description={`From ${source.accountName} · ${formatEUR(source.amount)} on ${new Date(source.date).toLocaleDateString("en-GB")}. It will show up under Budgets${
        isTransfer ? " as an expense for the account it leaves and income for the account it enters" : isIncome ? " as recurring income" : " as a recurring expense"
      }.`}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const parsed = parseMoney(amount);
          if (parsed === null || !(parsed > 0)) return setError("Enter an amount above zero.");
          const trimmed = name.trim();
          if (!trimmed) return setError("Give it a name.");
          // What the server would refuse is said here, before the sheet closes.
          if (utils.recurring.list.getData()?.some((item) => item.name === trimmed)) return setError("A recurring item with this name already exists.");
          recurring.create({
            name: trimmed,
            type: source.type,
            amount: parsed,
            intervalCount: n,
            intervalUnit: unit,
            categoryId: isTransfer ? null : categoryId || null,
            accountId: source.accountId,
            toAccountId: isTransfer ? source.toAccountId : undefined,
            // The other transactions of the same party are recognised from this one.
            fromTransactionId: source.id,
            lastDate: new Date(source.date),
          });
          onDone({ name: trimmed, type: source.type });
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <Field id="mark-count" label="How often">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Every</span>
            <Input
              id="mark-count"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className="w-20 text-center"
            />
            <Select items={SCHEDULE_UNITS.map((u) => ({ value: u, label: unitLabel(u, n) }))} value={unit} onValueChange={(v) => v && setUnit(v as ScheduleUnit)}>
              <SelectTrigger aria-label="Unit" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {unitLabel(u, n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>
        <TextField label="Amount (€)" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        {!isTransfer && (
          <Field id="mark-category" label="Category (optional)">
            <Select items={categoryItems} value={categoryId} onValueChange={(v) => v !== null && setCategoryId(v)}>
              <SelectTrigger id="mark-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg">
          Mark as recurring
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
