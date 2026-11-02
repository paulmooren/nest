"use client";

import { useMemo, useState } from "react";

import { trpc } from "@/trpc/react";
import { BASES, BASIS_WINDOW, amountForBasis, type BudgetBasis } from "@/lib/budget-basis";
import { formatEUR } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { monthlyEquivalent } from "@/lib/recurring";
import { describeSchedule } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useRecurringActions } from "@/components/finance/use-recurring";

const BASIS_LABELS: Record<BudgetBasis, { title: string; hint: string }> = {
  LATEST: { title: "Latest", hint: "the most recent payment" },
  LOWEST: { title: "Lowest", hint: `the lowest of the last ${BASIS_WINDOW}` },
  HIGHEST: { title: "Highest", hint: `the highest of the last ${BASIS_WINDOW}` },
  AVERAGE: { title: "Average", hint: `the average of the last ${BASIS_WINDOW}` },
  FIXED: { title: "Fixed", hint: "an amount you type" },
};

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * What an item has actually been paid, and what to budget for it: the payments as bars and a list (a one-off can be
 * set aside), the five ways to take the Budgeted amount from them, and what the choice comes to per month.
 */
export function PaymentHistorySheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { data } = trpc.recurring.history.useQuery({ id: itemId });
  const [picked, setPicked] = useState<BudgetBasis | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const { setBasis, setPaymentExcluded: setAside } = useRecurringActions(itemId);

  const counted = useMemo(() => (data?.payments ?? []).filter((p) => !p.excluded).map((p) => p.amount), [data]);
  const basis = picked ?? data?.basis ?? "LATEST";
  const fixedText = typed ?? (data ? String(data.amount) : "");
  const fixedAmount = parseMoney(fixedText);
  const resulting = basis === "FIXED" ? fixedAmount : amountForBasis(basis, counted);

  if (!data) {
    return (
      <ResponsiveSheet open wide onOpenChange={(o) => !o && onClose()} title="Payment history">
        <p className="py-8 text-center text-sm text-muted-foreground" role="status">
          Loading…
        </p>
      </ResponsiveSheet>
    );
  }

  const maxAmount = Math.max(...data.payments.map((p) => p.amount), 1);
  const monthly = resulting ? monthlyEquivalent(resulting, data.intervalCount, data.intervalUnit) : null;
  // Nothing to save when the same basis already gives the amount that is budgeted (a pending new amount is something to save).
  const unchanged = basis === data.basis && resulting !== null && resulting === data.amount;
  const recentStart = Math.max(0, data.payments.filter((p) => !p.excluded).length - BASIS_WINDOW);
  let seen = 0;

  return (
    <ResponsiveSheet open wide onOpenChange={(o) => !o && onClose()} title={data.name}>
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {data.payments.length} payment{data.payments.length === 1 ? "" : "s"} · {describeSchedule(data.intervalCount, data.intervalUnit).toLowerCase()}
          </p>
          {/* Oldest to newest. Set-aside ones are faded; the ones a basis looks at are solid. */}
          <div className="flex h-36 items-stretch gap-1.5 rounded-xl bg-muted px-3 pt-4 pb-2" role="img" aria-label="Payments over time, oldest first">
            {data.payments.map((p) => {
              const inWindow = !p.excluded && seen++ >= recentStart;
              const height = Math.max(4, (p.amount / maxAmount) * 100);
              return (
                <div key={p.id} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${formatEUR(p.amount)} · ${DAY.format(new Date(p.date))}${p.excluded ? " · set aside" : ""}`}>
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className={cn("w-full max-w-9 rounded-t-md", p.excluded ? "bg-foreground/20" : inWindow ? "bg-foreground" : "bg-foreground/40")}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{MONTH.format(new Date(p.date))}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">What to budget</h3>
          <div role="radiogroup" aria-label="Budgeted amount basis" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BASES.map((b) => {
              const amount = b === "FIXED" ? fixedAmount : amountForBasis(b, counted);
              const active = basis === b;
              return (
                <div
                  key={b}
                  role="radio"
                  tabIndex={data.canEdit ? 0 : -1}
                  aria-checked={active}
                  onClick={() => data.canEdit && setPicked(b)}
                  onKeyDown={(e) => {
                    if (data.canEdit && (e.key === " " || e.key === "Enter")) {
                      e.preventDefault();
                      setPicked(b);
                    }
                  }}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    active ? "border-foreground" : "hover:bg-muted",
                    data.canEdit ? "cursor-pointer" : "opacity-70"
                  )}
                >
                  <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", active && "border-foreground bg-foreground")} aria-hidden>
                    {active && <span className="size-1.5 rounded-full bg-background" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium md:text-sm">{BASIS_LABELS[b].title}</span>
                    <span className="block text-sm text-muted-foreground md:text-xs">{BASIS_LABELS[b].hint}</span>
                  </span>
                  {b === "FIXED" ? (
                    <Input
                      value={fixedText}
                      onChange={(e) => {
                        setTyped(e.target.value);
                        setPicked("FIXED");
                      }}
                      onClick={(e) => e.stopPropagation()}
                      inputMode="decimal"
                      aria-label="Fixed amount"
                      disabled={!data.canEdit}
                      className="w-24 text-right font-semibold tabular-nums"
                    />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">{amount === null ? "—" : formatEUR(amount)}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {monthly === null ? (
              "Nothing to budget with this choice yet."
            ) : (
              <>
                <span className="font-semibold text-foreground">{formatEUR(monthly)}</span> per month in your budget
                {resulting !== null && monthly !== resulting && ` (${formatEUR(resulting)} ${describeSchedule(data.intervalCount, data.intervalUnit).toLowerCase()})`}
              </>
            )}
          </p>
        </div>

        <div>
          <h3 className="mb-1 text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">Payments</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            A one-off (a bonus, a refund)? Set it aside: it stays a transaction but no longer counts here.
          </p>
          <ul className="max-h-56 divide-y overflow-y-auto rounded-xl border">
            {[...data.payments].reverse().map((p) => (
              <li key={p.id} className={cn("flex items-center gap-3 px-3.5 py-1.5 text-sm", p.excluded && "text-muted-foreground")}>
                <span className="w-24 shrink-0 text-muted-foreground tabular-nums">{DAY.format(new Date(p.date))}</span>
                <span className="min-w-0 flex-1 truncate">{p.merchant}</span>
                <span className={cn("font-medium tabular-nums", p.excluded && "line-through")}>{formatEUR(p.amount)}</span>
                {data.canEdit && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAside.mutate({ transactionId: p.id, excluded: !p.excluded })}>
                    {p.excluded ? "Include again" : "Set aside"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          {data.canEdit && (
            <Button
              type="button"
              size="lg"
              className="flex-1"
              disabled={resulting === null || resulting <= 0 || unchanged}
              onClick={() => {
                setBasis.mutate({ id: itemId, basis, amount: basis === "FIXED" ? (fixedAmount ?? undefined) : undefined });
                onClose();
              }}
            >
              {resulting !== null ? `Budget ${formatEUR(resulting)}` : "Use this"}
            </Button>
          )}
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            {data.canEdit ? "Cancel" : "Close"}
          </Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
