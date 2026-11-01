"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { formatEUR } from "@/lib/format";
import { describeSchedule } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import type { Suggestion, TxType } from "@/components/finance/budget-types";

/**
 * What the app found in your transactions, to review in one go: the confident ones are ticked, one tap adds them
 * all. Nothing is added until the Member says so. "Not recurring" removes a suggestion for good.
 */
export function SuggestionsSheet({
  suggestions,
  onDismiss,
  onClose,
}: {
  suggestions: Suggestion[];
  onDismiss: (matchKey: string) => void;
  onClose: () => void;
}) {
  // Finding and adding suggestions is worked out by the server, so this waits (the button shows it).
  const refresh = useRefresh();
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const add = trpc.recurring.addSuggestions.useMutation({
    onSuccess: () => {
      refresh("recurring.list", "recurring.suggestions", "transaction.list");
      onClose();
    },
  });

  const isTicked = (c: Suggestion) => override[c.matchKey] ?? c.confident;
  const ticked = suggestions.filter(isTicked);
  const order: Record<TxType, number> = { INCOME: 0, TRANSFER: 1, EXPENSE: 2 };
  const sorted = [...suggestions].sort((a, b) => order[a.type] - order[b.type] || b.amount - a.amount);

  return (
    <ResponsiveSheet
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={`${suggestions.length} recurring item${suggestions.length === 1 ? "" : "s"} found`}
      description="Found in your transactions by who they were with, so a changing description doesn't matter. The confident ones are ticked — nothing is added until you say so."
    >
      <div className="flex flex-col gap-4">
        <ul className="max-h-[50dvh] divide-y overflow-y-auto rounded-xl border">
          {sorted.map((c) => (
            <li key={c.matchKey} className="flex items-center gap-1 pr-2">
              <label className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pl-3">
                <Checkbox
                  checked={isTicked(c)}
                  onCheckedChange={(next) => setOverride((prev) => ({ ...prev, [c.matchKey]: next }))}
                  aria-label={`Add ${c.name}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium md:text-sm">
                    {c.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({c.type === "INCOME" ? "income" : c.type === "TRANSFER" ? "transfer" : "expense"})
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground md:text-xs">
                    {c.amountVaries ? "about " : ""}
                    {formatEUR(c.amount)}
                    {c.amountVaries && " · varies"} · {describeSchedule(c.intervalCount, c.intervalUnit)} · seen {c.occurrences}×
                  </span>
                </span>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => onDismiss(c.matchKey)}>
                Not recurring
              </Button>
            </li>
          ))}
        </ul>
        <Button
          size="lg"
          onClick={() => add.mutate({ matchKeys: ticked.map((c) => c.matchKey) })}
          disabled={ticked.length === 0 || add.isPending}
        >
          {add.isPending ? "Adding…" : `Add selected (${ticked.length})`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}
