"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { ChoiceChips, SheetField } from "@/components/choice-chips";
import { Modal, ModalFooter } from "@/components/modal";
import { PRIORITIES } from "@/components/tasks/priority-pill";
import type { Member, Task, TaskPriority } from "@/components/tasks/types";
import { inputClass } from "@/components/settings/form";

/** Everything you can change on a todo, as a bottom sheet: the phone's stand-in for the row's small pill, avatar and bin. */
export function TaskSheet({
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
  /** Closes the sheet and asks the parent to confirm. Omit to hide Delete (the dashboard's compact rows). */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const everyone = "everyone";
  const save = () => {
    const next = title.trim();
    if (next && next !== task.title) onUpdate({ title: next });
  };

  return (
    <Modal title="Todo" onClose={() => { save(); onClose(); }}>
      <div className="flex flex-col gap-5">
        <SheetField label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            aria-label="Title"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                save();
                onClose();
              }
            }}
            className={inputClass}
          />
        </SheetField>
        <SheetField label="Priority">
          <ChoiceChips
            label="Priority"
            value={task.priority}
            onChange={(priority) => onUpdate({ priority })}
            options={PRIORITIES.map((p) => ({
              value: p.value,
              label: p.label,
              leading: <span className="block h-2 w-2 rounded-full" style={{ background: p.dot }} />,
            }))}
          />
        </SheetField>
        {members.length > 1 && (
          <SheetField label="Assigned to">
            <ChoiceChips
              label="Assigned to"
              value={task.ownerId ?? everyone}
              onChange={(v) => onUpdate({ ownerId: v === everyone ? null : v })}
              options={[
                ...[...members]
                  .sort((a, b) => (a.user.id === currentUserId ? -1 : b.user.id === currentUserId ? 1 : 0))
                  .map((m) => ({ value: m.user.id, label: m.user.id === currentUserId ? "You" : m.user.name || m.user.email })),
                { value: everyone, label: "Everyone" },
              ]}
            />
          </SheetField>
        )}
      </div>
      <ModalFooter>
        <Button
          type="button"
          onClick={() => { save(); onClose(); }}
          className="min-h-[var(--tap-primary)] flex-1 rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-accent-ink"
        >
          Done
        </Button>
        {onDelete && (
          <Button
            type="button"
            onClick={onDelete}
            className="min-h-[var(--tap-primary)] rounded-xl border border-border-soft px-5 text-[15px] font-medium text-critical"
          >
            Delete
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
