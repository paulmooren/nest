"use client";

import { AlertTriangleIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { useRecurringActions } from "@/components/finance/use-recurring";
import { useReminderActions } from "@/components/reminders/use-reminders";
import type { ReminderData } from "@/components/reminders/types";
import { useStatementImport } from "@/components/today/use-statement-import";

const KIND_LABEL = {
  reminder: "Reminder",
  statement: "Statement",
  amount: "Budget",
  suggestions: "Suggestion",
  vault: "Vault",
} as const;

/**
 * Everything that needs you now (see Inbox in CONTEXT.md). The list comes from the server and an item is gone as
 * soon as the thing behind it is dealt with. Reminders, statements and Budgeted amount changes are handled in the
 * row; Suggestions and Vault Entries open the place where they are handled.
 */
export function Inbox() {
  const { data: items } = trpc.inbox.list.useQuery();
  const { data: reminders } = trpc.reminder.list.useQuery();
  const reminderActions = useReminderActions();
  const recurring = useRecurringActions();
  const statement = useStatementImport();

  if (!items) return null;

  return (
    <Section title="Inbox">
      {reminderActions.toast}
      {statement.ui}
      {items.length === 0 ? (
        <p className="text-base text-muted-foreground">You&apos;re all caught up.</p>
      ) : (
        <RowList>
          {items.map((item) => {
            const meta = (
              <>
                <span className="font-medium text-foreground">{KIND_LABEL[item.kind]}</span>
                {" · "}
                <span className={item.rank < 0 && item.kind !== "statement" ? "font-medium text-destructive" : undefined}>
                  {item.detail}
                </span>
              </>
            );

            if (item.kind === "reminder") {
              const reminder = (reminders as ReminderData[] | undefined)?.find((r) => r.id === item.reminderId);
              return (
                <Row
                  key={item.id}
                  check={{
                    checked: false,
                    onChange: () => reminder && reminderActions.tick(reminder),
                    label: `Mark ${item.title} as done`,
                  }}
                  title={item.title}
                  meta={meta}
                  wrapMeta
                  href={item.href}
                />
              );
            }

            if (item.kind === "statement") {
              return (
                <Row
                  key={item.id}
                  leading={<AlertTriangleIcon className="size-4 text-warning" aria-hidden />}
                  title={item.title}
                  meta={meta}
                  wrapMeta
                  trailing={
                    <Button
                      type="button"
                      size="sm"
                      disabled={statement.busyAccount !== null}
                      onClick={() => statement.start({ id: item.accountId, name: item.accountName })}
                    >
                      {statement.busyAccount === item.accountId ? "Importing…" : "Import"}
                    </Button>
                  }
                />
              );
            }

            if (item.kind === "amount") {
              return (
                <Row
                  key={item.id}
                  title={item.title}
                  meta={meta}
                  wrapMeta
                  trailing={
                    <span className="flex gap-1">
                      <Button type="button" size="sm" onClick={() => recurring.acceptProposal({ id: item.itemId })}>
                        Update
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => recurring.keepAmount({ id: item.itemId })}>
                        Keep
                      </Button>
                    </span>
                  }
                />
              );
            }

            return <Row key={item.id} title={item.title} meta={meta} wrapMeta href={item.href} chevron />;
          })}
        </RowList>
      )}
    </Section>
  );
}
