"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Row, RowList } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import { assigneeLabel } from "@/components/tasks/members";
import { PRIORITIES, PRIORITY_ORDER } from "@/components/tasks/priority";
import { TasksPage } from "@/components/tasks/tasks-page";
import { TodoSheet } from "@/components/tasks/todo-sheet";
import { useTaskActions } from "@/components/tasks/use-tasks";
import type { Member, Task } from "@/components/tasks/types";
import { useDelayed } from "@/components/use-delayed";

export default function TodosPage() {
  const { data: tasks } = trpc.task.list.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const showSkeleton = useDelayed(tasks === undefined);

  return (
    <TasksPage>
      {tasks === undefined ? (
        showSkeleton && (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-11 w-full" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )
      ) : (
        <Todos tasks={tasks as Task[]} members={household?.members ?? []} currentUserId={me?.id ?? ""} />
      )}
    </TasksPage>
  );
}

/**
 * Todos as a plain checklist: add one at the top, tick it off, tap it to change priority, assignee or title. Open
 * todos come highest priority first; done ones fold away under "Completed".
 */
function Todos({ tasks, members, currentUserId }: { tasks: Task[]; members: Member[]; currentUserId: string }) {
  const actions = useTaskActions();
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const open = tasks.filter((t) => !t.completedAt).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const completed = tasks.filter((t) => t.completedAt);
  const multiMember = members.length > 1;
  const editingTask = tasks.find((t) => t.id === editing);

  const row = (task: Task) => {
    const done = !!task.completedAt;
    const owner = members.find((m) => m.user.id === task.ownerId);
    const priority = PRIORITIES.find((p) => p.value === task.priority)!;
    return (
      <Row
        key={task.id}
        check={{
          checked: done,
          onChange: () => actions.toggle(task.id),
          label: done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`,
        }}
        title={task.title}
        done={done}
        meta={
          <span className="inline-flex items-center gap-1.5">
            <span className="block size-2 rounded-full" style={{ background: priority.dot }} aria-hidden />
            {priority.label}
            {multiMember && ` · ${assigneeLabel(task.ownerId, members, currentUserId)}`}
          </span>
        }
        trailing={
          multiMember && owner ? <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={28} /> : undefined
        }
        onClick={() => setEditing(task.id)}
      />
    );
  };

  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          actions.create({ title: title.trim(), priority: "MEDIUM", ownerId: multiMember ? currentUserId : currentUserId });
          setTitle("");
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          placeholder="Add a todo"
          aria-label="New todo"
          enterKeyHint="done"
        />
        <Button type="submit" disabled={!title.trim()}>
          Add
        </Button>
      </form>

      {open.length === 0 ? (
        <EmptyState title="Nothing to do. Add a todo above." />
      ) : (
        <RowList>{open.map(row)}</RowList>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="justify-between px-0 text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase"
          >
            <span>Completed · {completed.length}</span>
            <span className="font-medium tracking-normal normal-case">{showCompleted ? "Hide" : "Show"}</span>
          </Button>
          {showCompleted && <RowList>{completed.map(row)}</RowList>}
        </div>
      )}

      {editingTask && (
        <TodoSheet
          task={editingTask}
          members={members}
          currentUserId={currentUserId}
          onUpdate={(values) => actions.update(editingTask.id, values)}
          onDelete={() => {
            setEditing(null);
            setDeleting(editingTask);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title ?? ""}"?`}
        onConfirm={() => deleting && actions.remove(deleting.id)}
      />
    </>
  );
}
