"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";
import { parseMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { AFTER_ACCOUNT_CREATED } from "@/components/finance/use-accounts";
import { AFTER_BULK_TRANSACTION_CHANGE } from "@/components/finance/use-transactions";

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];
const typeItems = ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }));

/** First run with Finance on and no accounts: a first account, then (optionally) a first transaction. */
export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState<string | null>(null);

  const refresh = useRefresh();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: me } = trpc.user.me.useQuery();

  // Everything the wizard creates is the signing-up member's own (personal), not shared: with no owner it silently
  // became a joint account, which then counted toward household totals and nagged every member about it.
  const createAccount = trpc.account.create.useMutation({
    onSuccess: (account) => {
      setAccountId(account.id);
      refresh(...AFTER_ACCOUNT_CREATED);
      setStep(2);
    },
  });
  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: () => {
      refresh(...AFTER_BULK_TRANSACTION_CHANGE);
      setStep(4);
    },
  });

  // Step 1
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [balance, setBalance] = useState("");
  const parsedBalance = balance.trim() === "" ? null : parseMoney(balance);

  // Step 2
  const [kind, setKind] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const parsedAmount = parseMoney(amount);
  const categoryItems = [{ value: "", label: "No category" }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))];

  return (
    <div className="flex max-w-md flex-col gap-5">
      {step < 4 && (
        <p className="text-xs font-semibold tracking-[0.11em] text-muted-foreground uppercase">Step {Math.min(step, 2)} of 2</p>
      )}

      {step === 1 && (
        <>
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">Your first account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Checking, savings, credit card — what would you like to start with?</p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || parsedBalance === null) return;
              createAccount.mutate({
                name: name.trim(),
                institution: institution.trim() || undefined,
                type,
                startingBalance: parsedBalance,
                ownerId: me?.id ?? null,
              });
            }}
          >
            <TextField label="Account name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Checking" autoFocus />
            <TextField label="Bank (optional)" value={institution} onChange={(e) => setInstitution(e.target.value)} />
            <Field id="wizard-type" label="Type">
              <Select items={typeItems} value={type} onValueChange={(v) => v && setType(v as AccountType)}>
                <SelectTrigger id="wizard-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <TextField
              label="Starting balance (€)"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              hint="What is on the account today."
            />
            <Button type="submit" size="lg" disabled={createAccount.isPending || !me || !name.trim() || parsedBalance === null}>
              Continue
            </Button>
          </form>
        </>
      )}

      {step === 2 && accountId && (
        <>
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">Your first transaction</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add an expense or income — or skip this step.</p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!merchant.trim() || parsedAmount === null || parsedAmount <= 0) return;
              createTransaction.mutate({
                accountId,
                type: kind,
                amount: Math.abs(parsedAmount),
                date: new Date(date),
                merchant: merchant.trim(),
                categoryId: categoryId || undefined,
              });
            }}
          >
            <ChoiceChips
              label="Type"
              value={kind}
              onChange={setKind}
              options={[
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
              ]}
            />
            <TextField label="Amount (€)" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" autoFocus />
            <TextField label="Description" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Supermarket" />
            <Field id="wizard-category" label="Category (optional)">
              <Select items={categoryItems} value={categoryId} onValueChange={(v) => v !== null && setCategoryId(v)}>
                <SelectTrigger id="wizard-category" className="w-full">
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
            <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(4)}>
                Skip
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={createTransaction.isPending || !merchant.trim() || parsedAmount === null || parsedAmount <= 0}
              >
                Continue
              </Button>
            </div>
          </form>
        </>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">You&apos;re all set</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your dashboard is ready.</p>
          </div>
          <Button size="lg" onClick={onComplete}>
            Go to dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
