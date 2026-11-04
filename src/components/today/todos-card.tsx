"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/trpc/react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { assigneeLabel } from "@/components/tasks/members";
import { PRIORITIES, PRIORITY_ORDER } from "@/components/tasks/priority";
import { TodoSheet } from "@/components/tasks/todo-sheet";
import { useTaskActions } from "@/components/tasks/use-tasks";
import type { Member, Task } from "@/components/tasks/types";

/**
 * My open Todos, highest priority first, never another member's. Reminders and expiring Vault Entries are in the
 * Inbox now. The rows are the same as on the Tasks page, so ticking and editing work right here.
 *
 * `justCompleted` keeps a Todo visible (struck through) for this render after you check it off, instead of it
 * vanishing the instant the refetch lands.
 */
export function TodosCard() {
  const { data: tasks } = trpc.task.list.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const taskActions = useTaskActions();

  if (!tasks || !me) return null;

  const members: Member[] = household?.members ?? [];
  const multiMember = members.length > 1;

  const checklist = (tasks as Task[])
    .filter((t) => t.ownerId === null || t.ownerId === me.id)
    .filter((t) => !t.completedAt || justCompleted.has(t.id))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  if (checklist.length === 0) return null;

  const task = (tasks as Task[]).find((t) => t.id === editingTask);

  return (
    <Section title="Todos">
      <RowList>
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
                  {multiMember && ` · ${assigneeLabel(t.ownerId, members, me.id)}`}
                </span>
              }
              onClick={() => setEditingTask(t.id)}
            />
          );
        })}
      </RowList>

      <Link href="/tasks/todos" className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        View all
      </Link>

      {task && (
        <TodoSheet
          task={task}
          members={members}
          currentUserId={me.id}
          onUpdate={(values) => taskActions.update(task.id, values)}
          onDelete={() => {
            setEditingTask(null);
            setDeletingTask(task);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
      <ConfirmDelete
        open={!!deletingTask}
        onOpenChange={(o) => !o && setDeletingTask(null)}
        title={`Delete "${deletingTask?.title ?? ""}"?`}
        onConfirm={() => deletingTask && taskActions.remove(deletingTask.id)}
      />
    </Section>
  );
}
