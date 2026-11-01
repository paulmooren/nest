"use client";

import { useState } from "react";
import Link from "next/link";
import { LockKeyholeIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { daysUntil } from "@/lib/vault";
import { formatDate } from "@/lib/format";
import { agoLabel, describeSchedule, dueBucket, dueLabel, todayInHousehold } from "@/lib/schedule";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { ReminderFormSheet } from "@/components/reminders/reminder-form-sheet";
import type { ReminderData } from "@/components/reminders/types";
import { useReminderActions } from "@/components/reminders/use-reminders";
import { assigneeLabel } from "@/components/tasks/members";
import { PRIORITIES, PRIORITY_ORDER } from "@/components/tasks/priority";
import { TodoSheet } from "@/components/tasks/todo-sheet";
import { useTaskActions } from "@/components/tasks/use-tasks";
import type { Member, Task } from "@/components/tasks/types";

/**
 * "What needs my attention": Reminders due today or overdue that are mine or everyone's, Vault expiries coming up,
 * and my open Todos (highest priority first). Never another member's reminder or todo. The rows are the same as on
 * the Tasks page, so ticking and editing work right here — and ticking a Reminder shows the same "Undo" toast.
 *
 * `justCompleted` keeps a Todo visible (struck through) for this render after you check it off, instead of it
 * vanishing the instant the refetch lands.
 */
export function TasksSnapshot({ showTasks = true, showVault = false }: { showTasks?: boolean; showVault?: boolean }) {
  const { data: tasks } = trpc.task.list.useQuery(undefined, { enabled: showTasks });
  const { data: reminders } = trpc.reminder.list.useQuery(undefined, { enabled: showTasks });
  const { data: expiring } = trpc.vault.expiringSoon.useQuery(undefined, { enabled: showVault });
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<ReminderData | null>(null);
  const reminderActions = useReminderActions();
  const taskActions = useTaskActions();

  if ((showTasks && (!tasks || !reminders)) || !me) return null;

  const currentUserId = me.id;
  const members: Member[] = household?.members ?? [];
  const multiMember = members.length > 1;
  const today = todayInHousehold();

  const mine = <T extends { ownerId: string | null }>(items: T[]) =>
    items.filter((i) => i.ownerId === null || i.ownerId === currentUserId);

  const dueReminders = showTasks
    ? mine((reminders ?? []) as ReminderData[]).filter((r) => {
        const b = dueBucket(new Date(r.nextDueDate), today);
        return b === "overdue" || b === "today";
      })
    : [];

  const checklist = showTasks
    ? mine((tasks ?? []) as Task[])
        .filter((t) => !t.completedAt || justCompleted.has(t.id))
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    : [];

  // Vault expiries are never capped — an expiring passport must not be pushed out by a long list.
  const vaultRows = (showVault ? (expiring ?? []) : []).map((e) => ({ ...e, date: new Date(e.expiresOn!) }));

  if (dueReminders.length === 0 && checklist.length === 0 && vaultRows.length === 0) return null;

  const task = (tasks as Task[] | undefined)?.find((t) => t.id === editingTask);
  const reminder = (reminders as ReminderData[] | undefined)?.find((r) => r.id === editingReminder);

  return (
    <Section title={showTasks ? "Tasks" : "Coming up"}>
      {reminderActions.toast}
      <RowList>
        {dueReminders.map((r) => {
          const last = r.completions[0];
          const bucket = dueBucket(new Date(r.nextDueDate), today);
          return (
            <Row
              key={r.id}
              check={{ checked: false, onChange: () => reminderActions.tick(r), label: `Mark ${r.title} as done` }}
              title={r.title}
              wrapMeta
              meta={
                <>
                  <span className={bucket === "overdue" ? "font-medium text-destructive" : "font-medium text-foreground"}>
                    {dueLabel(new Date(r.nextDueDate), today)}
                  </span>
                  {` · ${describeSchedule(r.intervalCount, r.intervalUnit)} · ${last ? `last done ${agoLabel(new Date(last.completedAt), today)}` : "not done yet"}`}
                </>
              }
              onClick={() => setEditingReminder(r.id)}
            />
          );
        })}

        {vaultRows.map((e) => {
          const overdue = daysUntil(e.date) < 0;
          return (
            <Row
              key={`vault-${e.id}`}
              href="/vault"
              leading={<LockKeyholeIcon className="size-4 text-muted-foreground" aria-hidden />}
              title={`${e.title} expires`}
              meta={
                <span className={overdue ? "font-medium text-destructive" : undefined}>
                  {formatDate(e.date)}
                  {overdue ? " · overdue" : ""}
                </span>
              }
              chevron
            />
          );
        })}

        {checklist.map((t) => {
          const done = !!t.completedAt;
          const priority = PRIORITIES.find((p) => p.value === t.priority)!;
          return (
            <Row
              key={t.id}
              check={{
                checked: done,
                onChange: () => {
                  if (!done) setJustCompleted((prev) => new Set(prev).add(t.id));
                  taskActions.toggle(t.id);
                },
                label: done ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`,
              }}
              title={t.title}
              done={done}
              meta={
                <span className="inline-flex items-center gap-1.5">
                  <span className="block size-2 rounded-full" style={{ background: priority.dot }} aria-hidden />
                  {priority.label}
                  {multiMember && ` · ${assigneeLabel(t.ownerId, members, currentUserId)}`}
                </span>
              }
              onClick={() => setEditingTask(t.id)}
            />
          );
        })}
      </RowList>

      <Link href={showTasks ? "/tasks" : "/vault"} className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        View all
      </Link>

      {task && (
        <TodoSheet
          task={task}
          members={members}
          currentUserId={currentUserId}
          onUpdate={(values) => taskActions.update(task.id, values)}
          onDelete={() => {
            setEditingTask(null);
            setDeletingTask(task);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
      {reminder && (
        <ReminderFormSheet
          reminder={reminder}
          members={members}
          currentUserId={currentUserId}
          onUpdate={(patch) => reminderActions.update.mutate({ id: reminder.id, ...patch })}
          onDelete={() => {
            setEditingReminder(null);
            setDeletingReminder(reminder);
          }}
          onClose={() => setEditingReminder(null)}
        />
      )}
      <ConfirmDelete
        open={!!deletingTask}
        onOpenChange={(o) => !o && setDeletingTask(null)}
        title={`Delete "${deletingTask?.title ?? ""}"?`}
        onConfirm={() => deletingTask && taskActions.remove(deletingTask.id)}
      />
      <ConfirmDelete
        open={!!deletingReminder}
        onOpenChange={(o) => !o && setDeletingReminder(null)}
        title={`Delete "${deletingReminder?.title ?? ""}"?`}
        description="Its history goes with it."
        onConfirm={() => deletingReminder && reminderActions.remove.mutate({ id: deletingReminder.id })}
      />
    </Section>
  );
}
