"use client";

import { useState } from "react";

import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { Field } from "@/components/ds/field";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { TextField } from "@/components/ds/text-field";
import { assigneeOptions } from "@/components/tasks/members";
import { PRIORITIES } from "@/components/tasks/priority";
import type { Member, Task, TaskPriority } from "@/components/tasks/types";

/** Everything you can change on a todo. Title saves when the sheet closes; priority and assignee apply at once. */
export function TodoSheet({
  task,
  members,
  currentUserId,
  onUpdate,
  onDelete,
  onClose,
}: {
  task: Task;
  members: Member[];
  currentUserId: string;
  onUpdate: (values: { title?: string; priority?: TaskPriority; ownerId?: string | null }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const save = () => {
    const next = title.trim();
    if (next && next !== task.title) onUpdate({ title: next });
  };
  const close = () => {
    save();
    onClose();
  };

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && close()} title="Todo">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} enterKeyHint="done" />
        <Field id="todo-priority" label="Priority">
          <ChoiceChips
            label="Priority"
            value={task.priority}
            onChange={(priority) => onUpdate({ priority })}
            options={PRIORITIES.map((p) => ({
              value: p.value,
              label: p.label,
              leading: <span className="block size-2 rounded-full" style={{ background: p.dot }} aria-hidden />,
            }))}
          />
        </Field>
        {members.length > 1 && (
          <Field id="todo-assignee" label="Assigned to">
            <ChoiceChips
              label="Assigned to"
              value={task.ownerId ?? "everyone"}
              onChange={(v) => onUpdate({ ownerId: v === "everyone" ? null : v })}
              options={assigneeOptions(members, currentUserId)}
            />
          </Field>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1">
            Done
          </Button>
          <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
