"use client";

import Link from "next/link";

import { trpc } from "@/trpc/react";
import { daysBetween, describeSchedule, dueLabel, todayInHousehold } from "@/lib/schedule";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import type { ReminderData } from "@/components/reminders/types";
import { useReminderActions } from "@/components/reminders/use-reminders";

/** Reminders due within the next 7 days, overdue ones first: mine and everyone's, never a housemate's. */
const WINDOW_DAYS = 7;

/**
 * The Reminders you would tick off now. Ticking works right here, with the same "done — undo" toast as on the
 * Reminders page, and it clears the Reminder from the Inbox too.
 */
export function RemindersCard() {
  const { data: reminders } = trpc.reminder.list.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const actions = useReminderActions();

  if (!reminders || !me) return null;
  const today = todayInHousehold();

  const soon = (reminders as ReminderData[])
    .filter((r) => r.ownerId === null || r.ownerId === me.id)
    .filter((r) => daysBetween(today, new Date(r.nextDueDate)) <= WINDOW_DAYS)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime() || a.title.localeCompare(b.title));

  if (soon.length === 0) return null;

  return (
    <Section title="Reminders">
      {actions.toast}
      <RowList>
        {soon.map((r) => {
          const overdue = daysBetween(today, new Date(r.nextDueDate)) < 0;
          return (
            <Row
              key={r.id}
              check={{ checked: false, onChange: () => actions.tick(r), label: `Mark ${r.title} as done` }}
              title={r.title}
              href="/tasks/reminders"
              meta={
                <>
                  <span className={overdue ? "font-medium text-destructive" : "font-medium text-foreground"}>
                    {dueLabel(new Date(r.nextDueDate), today)}
                  </span>
                  {` · ${describeSchedule(r.intervalCount, r.intervalUnit)}`}
                </>
              }
            />
          );
        })}
      </RowList>
      <Link href="/tasks/reminders" className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        View all
      </Link>
    </Section>
  );
}
