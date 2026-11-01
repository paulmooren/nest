"use client";

import { useState } from "react";

import { parseMoney } from "@/lib/money";
import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { Field } from "@/components/ds/field";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ds/select";
import { TextField } from "@/components/ds/text-field";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER";

export type NewTx = {
  accountId: string;
  type: TxType;
  amount: number;
  date: Date;
  merchant: string;
  categoryId?: string;
  transferToAccountId?: string;
};

function Pick({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <Select items={items} value={value} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Add one transaction by hand. The amount comes first, with the decimal keyboard; errors sit next to their field. */
export function NewTxSheet({
  accounts,
  categories,
  initialAccountId,
  onSubmit,
  onClose,
}: {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  initialAccountId?: string;
  onSubmit: (values: NewTx) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<TxType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [accountId, setAccountId] = useState(
    initialAccountId && accounts.some((a) => a.id === initialAccountId) ? initialAccountId : (accounts[0]?.id ?? ""),
  );
  const [toId, setToId] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tried, setTried] = useState(false);

  const parsed = parseMoney(amount);
  const errors = {
    amount: parsed === null || parsed <= 0 ? "Enter an amount above zero." : undefined,
    merchant: merchant.trim() === "" ? "Say what it was for." : undefined,
    to: type === "TRANSFER" && !toId ? "Choose the destination account." : undefined,
  };
  const show = (e?: string) => (tried ? e : undefined);

  const accountItems = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="New transaction">
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (errors.amount || errors.merchant || errors.to || parsed === null) return;
          onSubmit({
            accountId,
            type,
            amount: Math.abs(parsed),
            date: new Date(date),
            merchant: merchant.trim(),
            categoryId: type === "TRANSFER" || categoryId === "none" ? undefined : categoryId,
            transferToAccountId: type === "TRANSFER" ? toId : undefined,
          });
          onClose();
        }}
      >
        <Field id="tx-type" label="Type">
          <ChoiceChips
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "EXPENSE", label: "Expense" },
              { value: "INCOME", label: "Income" },
              { value: "TRANSFER", label: "Transfer" },
            ]}
          />
        </Field>
        <TextField
          label="Amount (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          error={show(errors.amount)}
          autoFocus
        />
        <TextField
          label="Description"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Albert Heijn"
          error={show(errors.merchant)}
        />
        <Pick id="tx-account" label="Account" items={accountItems} value={accountId} onChange={setAccountId} />
        {type === "TRANSFER" ? (
          <Field id="tx-to" label="To account" error={show(errors.to)}>
            <Select
              items={accountItems.filter((a) => a.value !== accountId)}
              value={toId}
              onValueChange={(v) => v !== null && setToId(v)}
            >
              <SelectTrigger id="tx-to" className="w-full" aria-invalid={show(errors.to) ? true : undefined}>
                <SelectValue placeholder="Choose destination account" />
              </SelectTrigger>
              <SelectContent>
                {accountItems
                  .filter((a) => a.value !== accountId)
                  .map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Pick
            id="tx-category"
            label="Category (optional)"
            items={[{ value: "none", label: "No category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            value={categoryId}
            onChange={setCategoryId}
          />
        )}
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button type="submit" size="lg">
          Add transaction
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
