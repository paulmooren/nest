"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { ListTools } from "@/components/ui/list-tools";
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

type ReminderSort = "due" | "name";
const SORTS: { value: ReminderSort; label: string }[] = [
  { value: "due", label: "Due date" },
  { value: "name", label: "Name" },
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
 * Recurring chores grouped by how soon they are due, with tools to filter by person or by what is due now, sort
 * by name instead, and search.
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
  const [person, setPerson] = useState("all");
  const [due, setDue] = useState("any");
  const [sort, setSort] = useState<ReminderSort>("due");
  const [query, setQuery] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ReminderData | null>(null);
  const today = todayInHousehold();
  const multiMember = members.length > 1;

  const bucketOf = (r: ReminderData) => dueBucket(new Date(r.nextDueDate), today);
  const q = (query ?? "").trim().toLowerCase();
  const narrowed = person !== "all" || due !== "any" || q !== "";
  const shown = reminders.filter(
    (r) =>
      // A reminder for everyone is also each person's.
      (person === "all" || r.ownerId === person || r.ownerId === null) &&
      (due === "any" || bucketOf(r) === "overdue" || bucketOf(r) === "today") &&
      (!q || r.title.toLowerCase().includes(q)),
  );
  const editingReminder = reminders.find((r) => r.id === editing);

  // By due date the list is in its four groups; by name it is one list, each row still saying when it is due.
  const sections: { id: string; title: string; urgent?: boolean; rows: ReminderData[] }[] =
    sort === "due"
      ? BUCKETS.map((b) => ({ id: b.key, title: b.title, urgent: b.urgent, rows: shown.filter((r) => bucketOf(r) === b.key) }))
      : [{ id: "name", title: "By name", rows: [...shown].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })) }];

  return (
    <>
      {reminders.length > 0 && (
        <ListTools
          count={shown.length}
          noun={["reminder", "reminders"]}
          filters={[
            ...(multiMember
              ? [
                  {
                    key: "person",
                    label: "For",
                    value: person,
                    any: "all",
                    options: [
                      { value: "all", label: "Everyone" },
                      ...members.map((m) => ({ value: m.user.id, label: m.user.id === currentUserId ? "You" : memberName(m) })),
                    ],
                  },
                ]
              : []),
            {
              key: "due",
              label: "Due",
              value: due,
              any: "any",
              options: [
                { value: "any", label: "Any time" },
                { value: "now", label: "Today or overdue" },
              ],
            },
          ]}
          onFilter={(key, value) => (key === "person" ? setPerson(value) : setDue(value))}
          sort={{ value: sort, initial: "due", options: SORTS, onChange: setSort }}
          query={query}
          onQuery={setQuery}
          searchPlaceholder="Search reminders"
        />
      )}

      {shown.length === 0 && (
        <EmptyState
          title={narrowed ? "No reminder matches the filter or the search." : "Nothing recurring yet — add hoovering, watering the plants, worming the dog…"}
        />
      )}

      {sections.map(({ id, title, urgent, rows }) => {
        if (rows.length === 0) return null;
        return (
          <section key={id} aria-label={title} className="flex flex-col gap-2">
            <h2 className={`text-xs font-semibold tracking-[0.09em] uppercase ${urgent ? "text-destructive" : "text-muted-foreground"}`}>
              {title}
            </h2>
            <RowList>
              {rows.map((r) => {
                const key = bucketOf(r);
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
