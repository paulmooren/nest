"use client";

import { useState } from "react";
import { HistoryIcon } from "lucide-react";

import { parseMoney } from "@/lib/money";
import { SCHEDULE_UNITS, todayInHousehold, unitLabel, type ScheduleUnit } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import type { AccountOption, FormValues, Item, TxType } from "@/components/finance/budget-types";
import type { BudgetGroup } from "@/components/finance/expense-sections";
import type { Member } from "@/components/finance/ownership-groups";

const NEW_GROUP = "__new__";

function Pick({
  id,
  label,
  items,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <Field id={id} label={label} hint={hint}>
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

/**
 * A recurring income or expense, new or existing: name, amount, how often, when it is next due, category, Budget
 * group (expenses), the account it runs through. Visibility is not asked: it follows the account.
 */
export function RecurringFormSheet({
  initial,
  type: initialType,
  groups,
  categories,
  members,
  currentUserId,
  accounts,
  defaultAccountId,
  canEdit = true,
  onSubmit,
  onHistory,
  onDelete,
  onClose,
}: {
  initial?: Item;
  /** What kind of item this is (known from the section when adding). Income has no Budget group. */
  type: TxType;
  groups: BudgetGroup[];
  categories: { id: string; name: string; color: string }[];
  members: Member[];
  currentUserId: string;
  accounts: AccountOption[];
  defaultAccountId?: string;
  canEdit?: boolean;
  onSubmit: (values: FormValues, type: TxType) => void;
  onHistory?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const multiMember = members.length > 1;
  // A new item chooses income or expense here; an existing one keeps its kind.
  const [kind, setKind] = useState<TxType>(initialType);
  const type = initial ? initial.type : kind;
  // Only accounts you can edit (yours or shared) can carry a recurring item.
  const writable = accounts.filter((a) => a.ownerId === null || a.ownerId === currentUserId);
  const initialNext = (initial?.nextDueDate ? new Date(initial.nextDueDate) : todayInHousehold()).toISOString().slice(0, 10);

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [count, setCount] = useState(String(initial?.intervalCount ?? 1));
  const [unit, setUnit] = useState<ScheduleUnit>(initial?.intervalUnit ?? "MONTH");
  const [nextDate, setNextDate] = useState(initialNext);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  // "" = Other, a group id, or NEW_GROUP to type the name of a new one.
  const [groupChoice, setGroupChoice] = useState(initial?.budgetGroupId ?? "");
  const [newGroupName, setNewGroupName] = useState("");
  const [accountId, setAccountId] = useState(
    initial
      ? (initial.accountId ?? "")
      : writable.some((a) => a.id === defaultAccountId)
        ? (defaultAccountId as string)
        : (writable.find((a) => a.ownerId === currentUserId)?.id ?? writable[0]?.id ?? ""),
  );
  const [ownerId, setOwnerId] = useState(initial ? (initial.ownerId ?? "") : currentUserId);
  const [tried, setTried] = useState(false);

  const parsed = parseMoney(amount);
  const amountError = parsed === null || parsed <= 0 ? "Enter an amount above zero." : undefined;
  const nameError = name.trim() === "" ? "Give it a name." : undefined;
  const n = Math.max(1, Math.min(365, Math.round(Number(count) || 1)));

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={initial ? initial.name : type === "INCOME" ? "New income" : "New expense"}
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!canEdit || amountError || nameError || parsed === null) return;
          onSubmit(
            {
            name: name.trim(),
            amount: parsed,
            intervalCount: n,
            intervalUnit: unit,
            ...(nextDate && (!initial || nextDate !== initialNext) ? { nextDate } : {}),
            categoryId: categoryId || null,
            ...(type === "INCOME"
              ? {}
              : groupChoice === NEW_GROUP
                ? newGroupName.trim()
                  ? { newGroupName: newGroupName.trim() }
                  : {}
                : { budgetGroupId: groupChoice || null }),
            // With no partner yet, default to personal (not shared): the same privacy-conserving default as accounts.
            ownerId: multiMember ? ownerId || null : currentUserId,
            accountId: accountId || null,
            },
            type,
          );
          onClose();
        }}
      >
        <fieldset disabled={!canEdit} className="flex flex-col gap-5">
          {!initial && (
            <ChoiceChips
              label="Kind"
              value={kind}
              onChange={setKind}
              options={[
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
              ]}
            />
          )}
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} error={tried ? nameError : undefined} autoFocus={!initial} />
          <TextField
            label="Amount (€)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            error={tried ? amountError : undefined}
            hint={initial?.amountVaries ? "It varies; this is the average of the last three payments." : undefined}
          />

          <Field id="rec-count" label="Repeats every">
            <div className="flex gap-2">
              <Input
                id="rec-count"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))}
                inputMode="numeric"
                className="w-20 text-center"
              />
              <Select
                items={SCHEDULE_UNITS.map((u) => ({ value: u, label: unitLabel(u, n) }))}
                value={unit}
                onValueChange={(v) => v && setUnit(v as ScheduleUnit)}
              >
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
          <TextField label="Next payment" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />

          <Pick
            id="rec-category"
            label="Category"
            items={[{ value: "", label: "No category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            value={categoryId}
            onChange={setCategoryId}
          />
          {type !== "INCOME" && (
            <>
              <Pick
                id="rec-group"
                label="Budget group"
                items={[{ value: "", label: "No group" }, ...groups.map((g) => ({ value: g.id, label: g.name })), { value: NEW_GROUP, label: "New group…" }]}
                value={groupChoice}
                onChange={setGroupChoice}
              />
              {groupChoice === NEW_GROUP && (
                <TextField label="New group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} maxLength={60} autoFocus />
              )}
            </>
          )}
          {writable.length > 0 && (
            <Pick
              id="rec-account"
              label="Account"
              hint="Who can see this item follows the account."
              items={[{ value: "", label: "No account" }, ...writable.map((a) => ({ value: a.id, label: a.name }))]}
              value={accountId}
              onChange={setAccountId}
            />
          )}
          {multiMember && !accountId && (
            <Pick
              id="rec-owner"
              label="Belongs to"
              items={[
                { value: "", label: "Shared" },
                ...members.map((m) => ({ value: m.user.id, label: m.user.id === currentUserId ? "You" : m.user.name || m.user.email })),
              ]}
              value={ownerId}
              onChange={setOwnerId}
            />
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button type="submit" size="lg" className="flex-1">
              {initial ? "Save" : "Add"}
            </Button>
          )}
          {!canEdit && (
            <Button type="button" size="lg" className="flex-1" onClick={onClose}>
              Done
            </Button>
          )}
          {onHistory && (
            <Button type="button" variant="outline" size="lg" onClick={onHistory}>
              <HistoryIcon /> History
            </Button>
          )}
          {canEdit && onDelete && (
            <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </form>
    </ResponsiveSheet>
  );
}
