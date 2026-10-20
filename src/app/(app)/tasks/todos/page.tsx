"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { trpc } from "@/trpc/react";
import { PlusIcon, CloseIcon, CheckIcon } from "@/components/action-icons";
import { ChecklistRow } from "@/components/tasks/checklist-row";
import { useTaskActions } from "@/components/tasks/use-tasks";
import { AssigneeAvatar } from "@/components/tasks/assignee-avatar";
import { PriorityPill, PRIORITY_ORDER } from "@/components/tasks/priority-pill";
import { CELL_TEXT, type Task, type Member, type TaskPriority } from "@/components/tasks/types";

export default function TodosPage() {
  const { data: tasks } = trpc.task.list.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const taskActions = useTaskActions();

  return (
    <TaskChecklist
      tasks={(tasks ?? []) as Task[]}
      members={household?.members ?? []}
      currentUserId={me?.id ?? ""}
      onToggle={taskActions.toggle}
      onUpdate={taskActions.update}
      onDelete={taskActions.remove}
      onCreate={taskActions.create}
    />
  );
}

/**
 * Todos as a plain checklist: priority and who it's for, nothing else. Open
 * tasks come highest priority first; done ones fold away under "Completed".
 */
function TaskChecklist({
  tasks,
  members,
  currentUserId,
  onToggle,
  onUpdate,
  onDelete,
  onCreate,
}: {
  tasks: Task[];
  members: Member[];
  currentUserId: string;
  onToggle: (id: string) => void;
  onUpdate: (id: string, values: { title?: string; priority?: TaskPriority; ownerId?: string | null }) => void;
  onDelete: (id: string) => void;
  onCreate: (values: { title: string; priority: TaskPriority; ownerId: string | null }) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const open = tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const completed = tasks.filter((t) => t.completedAt);

  const row = (task: Task) => (
    <ChecklistRow
      key={task.id}
      task={task}
      members={members}
      currentUserId={currentUserId}
      onToggle={() => onToggle(task.id)}
      onUpdate={(values) => onUpdate(task.id, values)}
      onDelete={() => onDelete(task.id)}
    />
  );

  return (
    <section className="md:-mx-6">
      <h2 className="px-6 pb-4 text-[17px] font-semibold">Todos</h2>

      {open.length === 0 && !adding && (
        <p className="border-b border-border-soft px-6 py-4 text-[13px] text-text-muted">
          Nothing to do — add a todo below.
        </p>
      )}

      {open.map(row)}

      {adding ? (
        <NewTaskRow
          members={members}
          currentUserId={currentUserId}
          onAdd={onCreate}
          onClose={() => setAdding(false)}
        />
      ) : (
        <Button
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-3 border-b border-border-soft px-6 py-3 text-left text-text-faint transition-colors last:border-b-0 hover:text-text"
        >
          <span className="block h-2.5 w-2.5 shrink-0">
            <PlusIcon />
          </span>
          <span className={CELL_TEXT}>New todo</span>
        </Button>
      )}

      {completed.length > 0 && (
        <>
          <Button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="flex min-h-[var(--tap)] w-full items-center justify-between px-4 pt-4 pb-1 text-left md:px-6"
          >
            <span className="text-[12px] font-semibold tracking-[0.09em] text-text-faint uppercase">
              Completed · {completed.length}
            </span>
            <span className="text-[12.5px] font-medium text-accent">{showCompleted ? "Hide" : "Show"}</span>
          </Button>
          {showCompleted && completed.map(row)}
        </>
      )}
    </section>
  );
}

/** "+ New todo": title, priority and assignee on one line; Enter adds it and leaves a fresh line open. */
function NewTaskRow({
  members,
  currentUserId,
  onAdd,
  onClose,
}: {
  members: Member[];
  currentUserId: string;
  onAdd: (values: { title: string; priority: TaskPriority; ownerId: string | null }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [ownerId, setOwnerId] = useState<string | null>(currentUserId);
  const multiMember = members.length > 1;

  return (
    <form
      className="flex items-center gap-3 border-b border-border-soft bg-surface px-6 py-2.5 last:border-b-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({ title: title.trim(), priority, ownerId: multiMember ? ownerId : currentUserId });
        setTitle("");
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <span className="block h-6 w-6 shrink-0 rounded-lg border border-dashed border-border" aria-hidden />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
        maxLength={160}
        placeholder="What needs doing?"
        aria-label="New todo"
        className={`min-w-0 flex-1 bg-transparent ${CELL_TEXT} font-medium outline-none placeholder:font-normal placeholder:text-text-faint`}
      />
      <PriorityPill value={priority} onChange={setPriority} />
      {multiMember && (
        <AssigneeAvatar ownerId={ownerId} members={members} currentUserId={currentUserId} onChange={setOwnerId} />
      )}
      <Button type="submit" aria-label="Add todo" className="h-4 w-4 shrink-0 text-good hover:opacity-80">
        <CheckIcon />
      </Button>
      <Button type="button" onClick={onClose} aria-label="Done adding" className="h-4 w-4 shrink-0 text-text-muted hover:text-critical">
        <CloseIcon />
      </Button>
    </form>
  );
}
