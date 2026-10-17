"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { ChoiceChips, SheetField } from "@/components/choice-chips";
import { Modal, ModalFooter } from "@/components/modal";
import { inputClass } from "@/components/settings/form";
import type { Member } from "@/components/tasks/types";
import { ScheduleForm, type ReminderData, type ReminderPatch } from "@/components/reminders/reminder-row";

/** Everything you can change on a reminder, as a bottom sheet: title, schedule, who it's for, history and delete. */
export function ReminderSheet({
  reminder,
  members,
  currentUserId,
  onUpdate,
  onDelete,
  onClose,
}: {
  reminder: ReminderData;
  members: Member[];
  currentUserId: string;
  onUpdate: (patch: ReminderPatch) => void;
  /** Closes the sheet and asks the parent to confirm. Omit to hide Delete (the dashboard's compact rows). */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const everyone = "everyone";
  const save = () => {
    const next = title.trim();
    if (next && next !== reminder.title) onUpdate({ title: next });
  };

  return (
    <Modal title="Reminder" onClose={() => { save(); onClose(); }}>
      <div className="flex flex-col gap-5">
        <SheetField label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Title" className={inputClass} />
        </SheetField>
        <SheetField label="Repeats">
          <div className="rounded-xl border border-border-soft">
            <ScheduleForm initial={reminder} onSave={onUpdate} className="flex w-full flex-col gap-3 p-3 text-text-muted" />
          </div>
        </SheetField>
        {members.length > 1 && (
          <SheetField label="Assigned to">
            <ChoiceChips
              label="Assigned to"
              value={reminder.ownerId ?? everyone}
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
        {reminder.completions.length > 0 && (
          <SheetField label="Last done">
            <ul className="flex flex-col gap-1 text-[14px] text-text-muted">
              {reminder.completions.map((c) => (
                <li key={c.id}>
                  {new Date(c.completedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  {c.completedBy && ` · ${c.completedBy.name || c.completedBy.email}`}
                </li>
              ))}
            </ul>
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
