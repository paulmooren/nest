"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { ChoiceChips, SheetField } from "@/components/choice-chips";
import { Modal, ModalFooter } from "@/components/modal";
import type { Category } from "@/components/finance/category-cell";
import {
  NO_FILTERS,
  PRESETS,
  amountSummary,
  dateSummary,
  hasFilters,
  type TransactionFilters,
} from "@/components/finance/transaction-filters";
import { inputClass } from "@/components/settings/form";
import { parseMoney } from "@/lib/money";

const ALL = "all";

type Props = {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  categories: Category[];
  accounts: { id: string; label: string }[];
  accountFilter: string;
  onAccountChange: (accountId: string) => void;
};

/** Number of filters that are on, counting the account. */
export function filterCount({ filters, accountFilter }: Pick<Props, "filters" | "accountFilter">) {
  return (
    (accountFilter ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.categoryIds.length ? 1 : 0) +
    (filters.minAmount !== undefined || filters.maxAmount !== undefined ? 1 : 0)
  );
}

/**
 * The phone's filters: one "Filters" button (with a count) that opens a sheet with every filter, and the active
 * ones listed underneath as chips you can dismiss. Replaces the row of account and Date / Category / Amount chips.
 */
export function TransactionFilterSheet(props: Props) {
  const { filters, onChange, categories, accounts, accountFilter, onAccountChange } = props;
  const [open, setOpen] = useState(false);
  const count = filterCount(props);

  const categoryNames = filters.categoryIds.map((id) => (id === "none" ? "No category" : (categories.find((c) => c.id === id)?.name ?? "…")));
  const active: { key: string; label: string; clear: () => void }[] = [
    ...(accountFilter ? [{ key: "account", label: accounts.find((a) => a.id === accountFilter)?.label ?? "Account", clear: () => onAccountChange("") }] : []),
    ...(filters.from || filters.to
      ? [{ key: "date", label: dateSummary(filters), clear: () => onChange({ ...filters, from: undefined, to: undefined, dateLabel: undefined }) }]
      : []),
    ...(filters.categoryIds.length
      ? [{ key: "category", label: categoryNames.length > 1 ? `${categoryNames[0]} +${categoryNames.length - 1}` : categoryNames[0], clear: () => onChange({ ...filters, categoryIds: [] }) }]
      : []),
    ...(filters.minAmount !== undefined || filters.maxAmount !== undefined
      ? [{ key: "amount", label: amountSummary(filters), clear: () => onChange({ ...filters, minAmount: undefined, maxAmount: undefined }) }]
      : []),
  ];

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full border px-4 text-[15px] font-medium ${
          count ? "border-text bg-text text-bg" : "border-transparent bg-surface-2 text-text"
        }`}
      >
        Filters
        {count > 0 && <span className="rounded-full bg-bg/20 px-2 text-[13px] tabular-nums">{count}</span>}
      </Button>

      {active.length > 0 && (
        <div className="flex w-full flex-wrap gap-2" aria-label="Active filters">
          {active.map((a) => (
            <Button
              key={a.key}
              type="button"
              onClick={a.clear}
              aria-label={`Remove filter: ${a.label}`}
              className="inline-flex min-h-[var(--tap)] max-w-full items-center gap-2 rounded-full bg-surface-2 pr-3 pl-4 text-[14px] font-medium text-text-muted"
            >
              <span className="truncate">{a.label}</span>
              <span aria-hidden>✕</span>
            </Button>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Filters" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-5">
            {accounts.length > 1 && (
              <SheetField label="Account">
                <ChoiceChips
                  label="Account"
                  value={accountFilter || ALL}
                  onChange={(v) => onAccountChange(v === ALL ? "" : v)}
                  options={[{ value: ALL, label: "All" }, ...accounts.map((a) => ({ value: a.id, label: a.label }))]}
                />
              </SheetField>
            )}

            <SheetField label="Date">
              <ChoiceChips
                label="Date"
                value={filters.dateLabel ?? null}
                onChange={(label) => {
                  const preset = PRESETS.find((p) => p.label === label)!;
                  onChange({ ...filters, ...preset.range(), dateLabel: label });
                }}
                options={PRESETS.map((p) => ({ value: p.label, label: p.label }))}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="From"
                  value={filters.dateLabel ? "" : (filters.from ?? "")}
                  onChange={(e) => onChange({ ...filters, from: e.target.value || undefined, dateLabel: undefined })}
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <span className="text-text-faint">–</span>
                <Input
                  type="date"
                  aria-label="To"
                  value={filters.dateLabel ? "" : (filters.to ?? "")}
                  onChange={(e) => onChange({ ...filters, to: e.target.value || undefined, dateLabel: undefined })}
                  className={`${inputClass} min-w-0 flex-1`}
                />
              </div>
            </SheetField>

            <SheetField label="Category">
              <div className="flex flex-wrap gap-2">
                {[{ id: "none", name: "No category", color: "#c7c9cf" }, ...categories].map((c) => {
                  const on = filters.categoryIds.includes(c.id);
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onChange({
                          ...filters,
                          categoryIds: on ? filters.categoryIds.filter((id) => id !== c.id) : [...filters.categoryIds, c.id],
                        })
                      }
                      className={`inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full border px-4 text-[15px] font-medium ${
                        on ? "border-text bg-text text-bg" : "border-transparent bg-surface-2 text-text-muted"
                      }`}
                    >
                      <span className="block h-2 w-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </Button>
                  );
                })}
              </div>
            </SheetField>

            <SheetField label="Amount (ignoring the minus sign)">
              <div className="flex items-center gap-2">
                <AmountInput label="Minimum amount" placeholder="Min €" value={filters.minAmount} onCommit={(minAmount) => onChange({ ...filters, minAmount })} />
                <span className="text-text-faint">–</span>
                <AmountInput label="Maximum amount" placeholder="Max €" value={filters.maxAmount} onCommit={(maxAmount) => onChange({ ...filters, maxAmount })} />
              </div>
            </SheetField>
          </div>
          <ModalFooter>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[var(--tap-primary)] flex-1 rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-accent-ink"
            >
              Show results
            </Button>
            {(hasFilters(filters) || accountFilter) && (
              <Button
                type="button"
                onClick={() => {
                  onChange(NO_FILTERS);
                  onAccountChange("");
                }}
                className="min-h-[var(--tap-primary)] rounded-xl border border-border-soft px-5 text-[15px] font-medium"
              >
                Clear all
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

/** A money field that applies when you leave it (typing "12," isn't applied half-way). */
function AmountInput({ label, placeholder, value, onCommit }: { label: string; placeholder: string; value: number | undefined; onCommit: (value: number | undefined) => void }) {
  return (
    <Input
      aria-label={label}
      placeholder={placeholder}
      inputMode="decimal"
      defaultValue={value ?? ""}
      onBlur={(e) => {
        const raw = e.target.value.trim();
        if (!raw) return onCommit(undefined);
        const parsed = parseMoney(raw);
        if (parsed !== null && parsed >= 0) onCommit(parsed);
      }}
      className={`${inputClass} min-w-0 flex-1 tabular-nums`}
    />
  );
}
