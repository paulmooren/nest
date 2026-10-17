"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";

import { CheckIcon, TrashIcon } from "@/components/action-icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { InlineEdit } from "@/components/inline-edit";
import { AssigneeAvatar } from "@/components/tasks/assignee-avatar";
import { Avatar } from "@/components/avatar";
import { PRIORITIES, PriorityPill } from "@/components/tasks/priority-pill";
import { TaskSheet } from "@/components/tasks/task-sheet";
import type { Member, Task, TaskPriority } from "@/components/tasks/types";

/**
 * One line of the task checklist: tick box, a title you can click to rename,
 * a priority pill and who it's for. No dates, no repeats — a task is a thing
 * to do once.
 */
export function ChecklistRow({
  task,
  members,
  currentUserId,
  onToggle,
  onUpdate,
  onDelete,
  compact,
}: {
  task: Task;
  members: Member[];
  currentUserId: string;
  onToggle: () => void;
  onUpdate: (values: { title?: string; priority?: TaskPriority; ownerId?: string | null }) => void;
  onDelete: () => void;
  /** The dashboard's version: no delete (that lives on the Tasks page), so the row lines up with the card's edge. */
  compact?: boolean;
}) {
  const done = !!task.completedAt;
  const [confirming, setConfirming] = useState(false);
  // On a phone the title opens a sheet with everything editable; the pill, avatar and bin are desktop controls.
  const [sheetOpen, setSheetOpen] = useState(false);
  const multiMember = members.length > 1;
  const owner = members.find((m) => m.user.id === task.ownerId);
  const priority = PRIORITIES.find((p) => p.value === task.priority)!;

  return (
    <div className="group flex min-h-[56px] items-center gap-3 border-b border-border-soft px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface-hover md:min-h-0 md:px-6">
      <Button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        aria-pressed={done}
        className={`tap-target flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          done ? "border-good bg-good text-white" : "border-border text-transparent hover:border-good hover:text-good"
        }`}
      >
        <span className="block h-3.5 w-3.5">
          <CheckIcon />
        </span>
      </Button>

      <div className="min-w-0 flex-1">
        <InlineEdit
          value={task.title}
          ariaLabel="Todo"
          onCommit={(title) => onUpdate({ title })}
          display={<span className={done ? "line-through" : ""}>{task.title}</span>}
          className={`text-[14px] font-medium ${done ? "text-text-faint" : ""}`}
          buttonClassName="hidden w-full cursor-pointer truncate text-left md:block"
        />
        <Button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`Edit ${task.title}`}
          className={`line-clamp-2 min-h-[var(--tap)] w-full py-1 text-left text-[16px] font-medium md:hidden ${done ? "text-text-faint line-through" : ""}`}
        >
          {task.title}
        </Button>
      </div>

      <span className="hidden items-center gap-3 md:flex">
        <PriorityPill value={task.priority} onChange={(priority) => onUpdate({ priority })} muted={done} />

        {multiMember && (
          <AssigneeAvatar
            ownerId={task.ownerId}
            members={members}
            currentUserId={currentUserId}
            onChange={(ownerId) => onUpdate({ ownerId })}
          />
        )}

        {!compact && (
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${task.title}`}
            className="h-4 w-4 shrink-0 text-text-faint hover:text-critical"
          >
            <TrashIcon />
          </Button>
        )}
      </span>

      {/* Phone: read-only hints; change them in the sheet. */}
      <span className="flex items-center gap-2 md:hidden" aria-hidden>
        <span className={`block h-2.5 w-2.5 rounded-full ${done ? "opacity-40" : ""}`} style={{ background: priority.dot }} />
        {multiMember && owner && <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={28} />}
      </span>

      {sheetOpen && (
        <TaskSheet
          task={task}
          members={members}
          currentUserId={currentUserId}
          onUpdate={onUpdate}
          onDelete={
            compact
              ? undefined
              : () => {
                  setSheetOpen(false);
                  setConfirming(true);
                }
          }
          onClose={() => setSheetOpen(false)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={`Delete "${task.title}"?`}
          confirmLabel="Delete"
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
