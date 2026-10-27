"use client";

import Link from "next/link";

import { trpc } from "@/trpc/react";
import { useShoppingItems } from "@/components/shopping/use-shopping";
import { useDelayed } from "@/components/use-delayed";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReminderData } from "@/components/reminders/reminder-row";
import type { Task } from "@/components/tasks/types";
import { dueBucket, todayInHousehold } from "@/lib/schedule";

type Props = { tasks: boolean; shopping: boolean; vault: boolean };

/**
 * The dashboard's opener: one plain line of what needs attention now, each part a link to its page. Parts at zero
 * are left out; with nothing to do it says so. Counts follow the same rules as the cards below: reminders due or
 * overdue and open Tasks that are mine or everyone's, Vault expiries coming up, open items on the main shopping list.
 */
export function DashboardSummary({ tasks: showTasks, shopping: showShopping, vault: showVault }: Props) {
  const { data: tasks } = trpc.task.list.useQuery(undefined, { enabled: showTasks });
  const { data: reminders } = trpc.reminder.list.useQuery(undefined, { enabled: showTasks });
  const { data: expiring } = trpc.vault.expiringSoon.useQuery(undefined, { enabled: showVault });
  const { data: lists } = trpc.shopping.lists.useQuery(undefined, { enabled: showShopping });
  const { data: me } = trpc.user.me.useQuery();
  const main = lists?.find((l) => l.ownerId === null) ?? lists?.[0];
  const { data: items } = useShoppingItems(main?.id);

  const ready =
    !!me &&
    (!showTasks || (!!tasks && !!reminders)) &&
    (!showVault || !!expiring) &&
    (!showShopping || !!lists) &&
    (!main || !!items);
  const showSkeleton = useDelayed(!ready);

  if (!ready) return <div className="min-h-6">{showSkeleton && <Skeleton className="h-5 w-72 max-w-full" />}</div>;

  const mine = <T extends { ownerId: string | null }>(rows: T[]) =>
    rows.filter((r) => r.ownerId === null || r.ownerId === me.id);
  const today = todayInHousehold();

  const parts: { count: number; one: string; many: string; href: string }[] = [];
  if (showTasks) {
    const due = mine((reminders ?? []) as ReminderData[]).filter((r) => {
      const bucket = dueBucket(new Date(r.nextDueDate), today);
      return bucket === "overdue" || bucket === "today";
    }).length;
    const open = mine((tasks ?? []) as Task[]).filter((t) => !t.completedAt).length;
    parts.push({ count: due, one: "reminder due", many: "reminders due", href: "/tasks/reminders" });
    parts.push({ count: open, one: "open task", many: "open tasks", href: "/tasks/todos" });
  }
  if (showVault) parts.push({ count: expiring?.length ?? 0, one: "item expiring", many: "items expiring", href: "/vault" });
  if (showShopping) {
    const toBuy = (items ?? []).filter((i) => !i.checkedAt).length;
    parts.push({ count: toBuy, one: "item to buy", many: "items to buy", href: "/lists/shopping" });
  }
  const shown = parts.filter((p) => p.count > 0);

  return (
    <p className="min-h-6 text-[15px] text-text-muted">
      {shown.length === 0
        ? "Nothing due today."
        : shown.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " · "}
              <Link href={p.href} className="tap-target hover:text-text hover:underline">
                <span className="font-semibold text-text">{p.count}</span> {p.count === 1 ? p.one : p.many}
              </Link>
            </span>
          ))}
    </p>
  );
}
