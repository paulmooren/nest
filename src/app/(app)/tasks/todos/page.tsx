"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ListTools } from "@/components/ui/list-tools";
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
type TodoSort = "priority" | "added" | "name";
const SORTS: { value: TodoSort; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "added", label: "Recently added" },
  { value: "name", label: "Name" },
];
/** Orders a list that arrives oldest first. "Recently added" is that list turned round. */
function ordered(tasks: Task[], sort: TodoSort): Task[] {
  if (sort === "added") return [...tasks].reverse();
  if (sort === "name") return [...tasks].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function Todos({ tasks, members, currentUserId }: { tasks: Task[]; members: Member[]; currentUserId: string }) {
  const actions = useTaskActions();
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priority, setPriority] = useState("any");
  const [assignee, setAssignee] = useState("anyone");
  const [sort, setSort] = useState<TodoSort>("priority");
  const [query, setQuery] = useState<string | null>(null);

  const multiMember = members.length > 1;
  const q = (query ?? "").trim().toLowerCase();
  const narrowed = priority !== "any" || assignee !== "anyone" || q !== "";
  const shown = tasks.filter(
    (t) =>
      (priority === "any" || t.priority === priority) &&
      // A todo for everyone is also yours.
      (assignee === "anyone" || t.ownerId === assignee || t.ownerId === null) &&
      (!q || t.title.toLowerCase().includes(q)),
  );
  const open = ordered(shown.filter((t) => !t.completedAt), sort);
  const completed = shown.filter((t) => t.completedAt);
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

      {tasks.length > 0 && (
        <ListTools
          count={open.length}
          noun={["todo", "todos"]}
          filters={[
            {
              key: "priority",
              label: "Priority",
              value: priority,
              any: "any",
              options: [{ value: "any", label: "Any priority" }, ...PRIORITIES.map((p) => ({ value: p.value, label: p.label }))],
            },
            ...(multiMember
              ? [
                  {
                    key: "assignee",
                    label: "For",
                    value: assignee,
                    any: "anyone",
                    options: [
                      { value: "anyone", label: "Anyone" },
                      ...members.map((m) => ({ value: m.user.id, label: m.user.id === currentUserId ? "You" : m.user.name || m.user.email })),
                    ],
                  },
                ]
              : []),
          ]}
          onFilter={(key, value) => (key === "priority" ? setPriority(value) : setAssignee(value))}
          sort={{ value: sort, initial: "priority", options: SORTS, onChange: setSort }}
          query={query}
          onQuery={setQuery}
          searchPlaceholder="Search todos"
        />
      )}

      {open.length === 0 ? (
        <EmptyState title={narrowed ? "No open todo matches the filter or the search." : "Nothing to do. Add a todo above."} />
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
