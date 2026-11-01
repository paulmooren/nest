"use client";

import { useState } from "react";

import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";
import { parseMoney } from "@/lib/money";
import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { Field } from "@/components/ds/field";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ds/select";
import { TextField } from "@/components/ds/text-field";
import type { Member } from "@/components/finance/ownership-groups";

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

export type AccountValues = {
  name: string;
  institution?: string;
  iban: string | null;
  type: AccountType;
  startingBalance: number;
  ownerId: string | null;
  visibleToHousehold?: boolean;
};

export type AccountInitial = {
  name: string;
  institution: string | null;
  iban: string | null;
  type: string;
  startingBalance: unknown;
  ownerId: string | null;
  visibleToHousehold: boolean;
};

/** New or edit account. Visibility is set here, on a Personal account, and covers its transactions and recurring items. */
export function AccountSheet({
  initial,
  members,
  currentUserId,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  initial?: AccountInitial;
  members: Member[];
  currentUserId: string;
  pending?: boolean;
  error?: string;
  onSubmit: (values: AccountValues) => void;
  onClose: () => void;
}) {
  const showOwnerPicker = members.length > 1;
  const [name, setName] = useState(initial?.name ?? "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [iban, setIban] = useState(initial?.iban ?? "");
  const [type, setType] = useState<AccountType>((initial?.type as AccountType) ?? "CHECKING");
  // With no partner yet, default to personal (not shared): otherwise it would retroactively become visible to
  // whoever joins the household later, without an explicit choice.
  const [ownerId, setOwnerId] = useState<string | null>(initial ? initial.ownerId : currentUserId);
  const [balance, setBalance] = useState(initial ? String(Number(initial.startingBalance)) : "");
  const [visible, setVisible] = useState(initial?.visibleToHousehold ?? true);

  const parsed = balance.trim() === "" ? 0 : parseMoney(balance);
  const balanceError = parsed === null ? "Enter an amount like 1.250,50." : undefined;
  const valid = name.trim() !== "" && !balanceError;
  const effectiveOwner = showOwnerPicker ? ownerId : currentUserId;
  const typeItems = ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }));
  const ownerItems = [
    { value: "shared", label: "Shared / Joint" },
    ...members.map((m) => ({ value: m.user.id, label: m.user.id === currentUserId ? "You" : (m.user.name ?? m.user.email) })),
  ];

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={initial ? "Edit account" : "New account"}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || parsed === null) return;
          onSubmit({
            name: name.trim(),
            institution: institution.trim() || undefined,
            iban: iban.trim() || null,
            type,
            startingBalance: parsed,
            ownerId: effectiveOwner,
            ...(effectiveOwner !== null && initial ? { visibleToHousehold: visible } : {}),
          });
        }}
      >
        <TextField label="Account name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily spending" autoFocus={!initial} />
        <TextField label="Bank (optional)" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. bunq" />
        <TextField
          label="IBAN (optional)"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="Filled in from your first bank statement"
          autoComplete="off"
        />
        <Field id="account-type" label="Type">
          <Select items={typeItems} value={type} onValueChange={(v) => v && setType(v as AccountType)}>
            <SelectTrigger id="account-type" className="w-full">
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
        {showOwnerPicker && (
          <Field id="account-owner" label="Owner">
            <Select
              items={ownerItems}
              value={ownerId ?? "shared"}
              onValueChange={(v) => v && setOwnerId(v === "shared" ? null : v)}
            >
              <SelectTrigger id="account-owner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ownerItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {effectiveOwner !== null && initial && (
          <Field
            id="account-visibility"
            label="Visibility"
            hint="Covers this account, its transactions and its recurring items. Shared accounts are always visible."
          >
            <ChoiceChips
              label="Visibility"
              value={visible ? "visible" : "private"}
              onChange={(v) => setVisible(v === "visible")}
              options={[
                { value: "private", label: "Private" },
                { value: "visible", label: "Visible to household" },
              ]}
            />
          </Field>
        )}
        <TextField
          label="Starting balance (€)"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          error={balanceError}
          hint="The balance before any transactions. The current balance is this plus your transaction history."
        />
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={!valid || pending}>
          {initial ? "Save" : "Create account"}
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
