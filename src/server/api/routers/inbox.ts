import type { PrismaClient } from "@prisma/client";

import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { statementsDueFor } from "@/server/api/routers/dashboard";
import { openSuggestions, pendingProposals } from "@/server/api/routers/recurring";
import { expiringEntries } from "@/server/vault-access";
import { isModuleEnabled, type ModuleKey } from "@/lib/modules";
import { daysBetween, todayInHousehold } from "@/lib/schedule";
import { statementRange } from "@/lib/statement-due";

type Ctx = { prisma: PrismaClient; householdId: string; userId: string };

/**
 * One row of the Inbox. `rank` orders the list: days until it is due, so overdue is negative and the most urgent
 * comes first. Things with no date, a decision waiting on the Member, count as due today (0).
 */
export type InboxItem = { id: string; rank: number; title: string; detail: string } & (
  | { kind: "reminder"; href: string; reminderId: string }
  | { kind: "statement"; href: string; accountId: string; accountName: string }
  | { kind: "vault"; href: string }
  | { kind: "suggestions"; href: string; count: number }
  | { kind: "amount"; href: string; itemId: string; amount: number; proposal: number }
);

const KIND_ORDER: Record<InboxItem["kind"], number> = {
  reminder: 0,
  statement: 1,
  amount: 2,
  suggestions: 3,
  vault: 4,
};

const euro = (n: number) => `€${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;

function dueDetail(days: number, label: string) {
  if (days === 0) return `${label} today`;
  if (days === 1) return `${label} tomorrow`;
  if (days === -1) return `${label} yesterday`;
  return days > 0 ? `${label} in ${days} days` : `${-days} days overdue`;
}

/** "Valid until 12 Dec · in 32 days", or "· 5 days ago" once it has passed. */
function expiryDetail(label: string, date: Date, days: number) {
  const when = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const rel = days === 0 ? "today" : days > 0 ? `in ${days} days` : `${-days} days ago`;
  return `${label} ${when} · ${rel}`;
}

/**
 * Everything that needs this Member now (see Inbox in CONTEXT.md): their own Reminders and ones for everyone that
 * are due or overdue, statements due (90 days since the last import) for accounts they own or share, Vault Entries they can edit
 * that are expiring, new recurring items waiting to be confirmed, and Budgeted amount changes waiting for approval.
 * Computed on every call — an item disappears when the thing behind it is dealt with. Modules that are off add nothing.
 */
export async function inboxItems(ctx: Ctx): Promise<InboxItem[]> {
  const household = await ctx.prisma.household.findUnique({
    where: { id: ctx.householdId },
    select: { disabledModules: true },
  });
  const on = (key: ModuleKey) => isModuleEnabled(household?.disabledModules ?? [], key);
  const today = todayInHousehold();

  const [reminders, statements, vault, suggestions, proposals] = await Promise.all([
    on("tasks")
      ? ctx.prisma.reminder.findMany({
          where: {
            householdId: ctx.householdId,
            nextDueDate: { lte: today },
            OR: [{ ownerId: null }, { ownerId: ctx.userId }],
          },
          select: { id: true, title: true, nextDueDate: true },
        })
      : [],
    on("finance") ? statementsDueFor(ctx, today) : [],
    on("vault") ? expiringEntries(ctx) : [],
    on("finance") ? openSuggestions(ctx) : [],
    on("finance") ? pendingProposals(ctx) : [],
  ]);

  const items: InboxItem[] = [];

  for (const r of reminders) {
    const days = daysBetween(today, r.nextDueDate);
    items.push({
      id: `reminder:${r.id}`,
      kind: "reminder",
      rank: days,
      title: r.title,
      detail: dueDetail(days, "Due"),
      href: "/tasks/reminders",
      reminderId: r.id,
    });
  }

  // Due once 90 days have passed since the last import; it has been waiting as many days as have passed since then.
  for (const s of statements) {
    items.push({
      id: `statement:${s.accountId}`,
      kind: "statement",
      rank: daysBetween(s.dueOn, today) * -1,
      title: `${s.accountName}: statement needed`,
      detail: statementRange(s.from, s.to),
      href: `/finance/accounts/${s.accountId}`,
      accountId: s.accountId,
      accountName: s.accountName,
    });
  }

  for (const e of vault) {
    const days = daysBetween(today, e.expiresOn!);
    items.push({
      id: `vault:${e.id}`,
      kind: "vault",
      rank: days,
      title: e.title,
      detail: expiryDetail((e.expiryLabel ?? "").trim() || "Expires", e.expiresOn!, days),
      href: `/vault/${e.id}`,
    });
  }

  // The Budget page shows one scope at a time (You, or the Household), so a row opens the scope it counts.
  const scopeHref = (ownerId: string | null) => (ownerId === null ? "/finance/budgets?scope=household" : "/finance/budgets");
  for (const owner of [ctx.userId, null] as const) {
    const count = suggestions.filter((s) => s.ownerId === owner).length;
    if (count === 0) continue;
    items.push({
      id: `suggestions:${owner === null ? "household" : "you"}`,
      kind: "suggestions",
      rank: 0,
      title: count === 1 ? "1 recurring item found" : `${count} recurring items found`,
      detail: owner === null ? "Review what was detected on the Household's accounts" : "Review what was detected from your transactions",
      href: scopeHref(owner),
      count,
    });
  }

  for (const p of proposals) {
    items.push({
      id: `amount:${p.id}`,
      kind: "amount",
      rank: 0,
      title: p.name,
      detail: `Budgeted ${euro(p.amount)}, payments now suggest ${euro(p.proposal)}`,
      href: scopeHref(p.ownerId),
      itemId: p.id,
      amount: p.amount,
      proposal: p.proposal,
    });
  }

  return items.sort(
    (a, b) => a.rank - b.rank || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title),
  );
}

export const inboxRouter = createTRPCRouter({
  list: householdProcedure.query(({ ctx }) => inboxItems(ctx)),
});
