"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { Row, RowList } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReminderData } from "@/components/reminders/types";
import { ReminderFormSheet } from "@/components/reminders/reminder-form-sheet";
import { useReminderActions } from "@/components/reminders/use-reminders";
import { memberName } from "@/components/tasks/members";
import { TasksPage } from "@/components/tasks/tasks-page";
import type { Member } from "@/components/tasks/types";
import { useDelayed } from "@/components/use-delayed";
import { agoLabel, describeSchedule, dueBucket, dueLabel, todayInHousehold, type DueBucket } from "@/lib/schedule";

const BUCKETS: { key: DueBucket; title: string; urgent?: boolean }[] = [
  { key: "overdue", title: "Overdue", urgent: true },
  { key: "today", title: "Due today" },
  { key: "week", title: "This week" },
  { key: "later", title: "Later" },
];

export default function RemindersPage() {
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: reminders } = trpc.reminder.list.useQuery();
  const actions = useReminderActions();
  const [adding, setAdding] = useState(false);
  const showSkeleton = useDelayed(reminders === undefined);

  return (
    <TasksPage
      actions={
        <Button onClick={() => setAdding(true)}>
          <PlusIcon /> Reminder
        </Button>
      }
    >
      {actions.toast}
      {reminders === undefined ? (
        showSkeleton && (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading…</span>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )
      ) : (
        <Reminders
          reminders={reminders as ReminderData[]}
          members={household?.members ?? []}
          currentUserId={me?.id ?? ""}
          actions={actions}
        />
      )}
      {adding && (
        <ReminderFormSheet
          members={household?.members ?? []}
          currentUserId={me?.id ?? ""}
          onAdd={(values) => actions.create.mutate(values)}
          onClose={() => setAdding(false)}
        />
      )}
    </TasksPage>
  );
}

/**
 * Recurring chores grouped by how soon they are due, with chips to look at everyone's, yours, or one person's.
 * Ticking one records who did it and schedules the next; a toast offers to undo a mis-tap.
 */
function Reminders({
  reminders,
  members,
  currentUserId,
  actions,
}: {
  reminders: ReminderData[];
  members: Member[];
  currentUserId: string;
  actions: ReturnType<typeof useReminderActions>;
}) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ReminderData | null>(null);
  const today = todayInHousehold();
  const multiMember = members.length > 1;

  const shown = reminders.filter((r) => filter === "all" || r.ownerId === filter || r.ownerId === null);
  const editingReminder = reminders.find((r) => r.id === editing);

  return (
    <>
      {multiMember && (
        <ChoiceChips
          label="Show reminders for"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            ...members.map((m) => ({ value: m.user.id, label: m.user.id === currentUserId ? "You" : memberName(m) })),
          ]}
        />
      )}

      {shown.length === 0 && (
        <EmptyState title="Nothing recurring yet — add hoovering, watering the plants, worming the dog…" />
      )}

      {BUCKETS.map(({ key, title, urgent }) => {
        const inBucket = shown.filter((r) => dueBucket(new Date(r.nextDueDate), today) === key);
        if (inBucket.length === 0) return null;
        return (
          <section key={key} aria-label={title} className="flex flex-col gap-2">
            <h2 className={`text-xs font-semibold tracking-[0.09em] uppercase ${urgent ? "text-destructive" : "text-muted-foreground"}`}>
              {title}
            </h2>
            <RowList>
              {inBucket.map((r) => {
                const due = new Date(r.nextDueDate);
                const last = r.completions[0];
                const owner = members.find((m) => m.user.id === r.ownerId);
                const doneBy = last?.completedBy
                  ? ` by ${last.completedBy.id === currentUserId ? "you" : last.completedBy.name || last.completedBy.email}`
                  : "";
                return (
                  <Row
                    key={r.id}
                    check={{ checked: false, onChange: () => actions.tick(r), label: `Mark ${r.title} as done` }}
                    title={r.title}
                    wrapMeta
                    meta={
                      <>
                        <span className={key === "overdue" ? "font-medium text-destructive" : key === "today" ? "font-medium text-foreground" : ""}>
                          {dueLabel(due, today)}
                        </span>
                        {` · ${describeSchedule(r.intervalCount, r.intervalUnit)} · ${
                          last ? `last done ${agoLabel(new Date(last.completedAt), today)}${doneBy}` : "not done yet"
                        }`}
                      </>
                    }
                    trailing={
                      multiMember && owner ? (
                        <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={28} />
                      ) : undefined
                    }
                    onClick={() => setEditing(r.id)}
                  />
                );
              })}
            </RowList>
          </section>
        );
      })}

      {editingReminder && (
        <ReminderFormSheet
          reminder={editingReminder}
          members={members}
          currentUserId={currentUserId}
          onUpdate={(patch) => actions.update.mutate({ id: editingReminder.id, ...patch })}
          onDelete={() => {
            setEditing(null);
            setDeleting(editingReminder);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title ?? ""}"?`}
        description="Its history goes with it."
        onConfirm={() => deleting && actions.remove.mutate({ id: deleting.id })}
      />
    </>
  );
}
