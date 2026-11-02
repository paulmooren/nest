"use client";

import { useState } from "react";

import { parseMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/utils";
import { NO_FILTERS, PRESETS, type TransactionFilters } from "@/components/finance/transaction-filters";

type Category = { id: string; name: string; color: string };

/** Date range, categories and amount in one sheet. Nothing applies until Apply, so the list does not reload per tap. */
export function TxFilterSheet({
  filters,
  categories,
  onApply,
  onClose,
}: {
  filters: TransactionFilters;
  categories: Category[];
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [dateLabel, setDateLabel] = useState(filters.dateLabel);
  const [categoryIds, setCategoryIds] = useState(filters.categoryIds);
  const [min, setMin] = useState(filters.minAmount !== undefined ? String(filters.minAmount) : "");
  const [max, setMax] = useState(filters.maxAmount !== undefined ? String(filters.maxAmount) : "");

  const parse = (text: string) => (text.trim() === "" ? undefined : (parseMoney(text) ?? NaN));
  const minAmount = parse(min);
  const maxAmount = parse(max);
  const minError = minAmount !== undefined && Number.isNaN(minAmount) ? "Enter an amount." : undefined;
  const maxError = maxAmount !== undefined && Number.isNaN(maxAmount) ? "Enter an amount." : undefined;

  const toggle = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  const options = [{ id: "none", name: "Uncategorized", color: "#c7c9cf" }, ...categories];

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="Filters">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (minError || maxError) return;
          onApply({
            from: from || undefined,
            to: to || undefined,
            dateLabel: from || to ? dateLabel : undefined,
            categoryIds,
            minAmount: minAmount !== undefined ? minAmount : undefined,
            maxAmount: maxAmount !== undefined ? maxAmount : undefined,
          });
          onClose();
        }}
      >
        <Field id="filter-presets" label="Period">
          <ChoiceChips
            label="Period"
            value={dateLabel ?? null}
            onChange={(label) => {
              const preset = PRESETS.find((p) => p.label === label)!;
              const range = preset.range();
              setFrom(range.from);
              setTo(range.to);
              setDateLabel(label);
            }}
            options={PRESETS.map((p) => ({ value: p.label, label: p.label }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="From"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setDateLabel(undefined);
            }}
          />
          <TextField
            label="To"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setDateLabel(undefined);
            }}
          />
        </div>

        <Field id="filter-categories" label="Categories">
          <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
            {options.map((c) => {
              const on = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-base font-medium transition-colors md:min-h-9 md:text-sm",
                    on ? "border-foreground bg-foreground text-background" : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="block size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
                  {c.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <TextField label="Amount from (€)" value={min} onChange={(e) => setMin(e.target.value)} inputMode="decimal" placeholder="0" error={minError} />
          <TextField label="Amount to (€)" value={max} onChange={(e) => setMax(e.target.value)} inputMode="decimal" placeholder="Any" error={maxError} />
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1">
            Show results
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              onApply(NO_FILTERS);
              onClose();
            }}
          >
            Clear
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
