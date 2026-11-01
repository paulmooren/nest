"use client";

import { useState } from "react";

import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { Field } from "@/components/ds/field";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { TextField } from "@/components/ds/text-field";
import { ScheduleFields, type Schedule } from "@/components/reminders/schedule-fields";
import { assigneeOptions } from "@/components/tasks/members";
import type { Member } from "@/components/tasks/types";
import type { ReminderData, ReminderPatch } from "@/components/reminders/reminder-row";

export type NewReminder = Schedule & { title: string; ownerId: string | null; firstDueDate?: Date };

type Props = {
  members: Member[];
  currentUserId: string;
  onClose: () => void;
} & (
  | { reminder?: undefined; onAdd: (values: NewReminder) => void }
  | { reminder: ReminderData; onUpdate: (patch: ReminderPatch) => void; onDelete: () => void }
);

/**
 * One form for a new reminder and for editing one: title, schedule, who it is for, and (when new) the first due
 * date. Nothing is saved until Save, so a half-edited schedule never reaches the list.
 */
export function ReminderFormSheet(props: Props) {
  const { members, currentUserId, onClose, reminder } = props;
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [schedule, setSchedule] = useState<Schedule>({
    intervalCount: reminder?.intervalCount ?? 1,
    intervalUnit: reminder?.intervalUnit ?? "WEEK",
    mode: reminder?.mode ?? "FROM_DONE",
  });
  const [ownerId, setOwnerId] = useState<string | null>(reminder ? reminder.ownerId : currentUserId);
  const [firstDue, setFirstDue] = useState(new Date().toLocaleDateString("en-CA"));
  const multiMember = members.length > 1;

  const valid = title.trim() !== "" && schedule.intervalCount >= 1;

  function save() {
    if (!valid) return;
    const owner = multiMember ? ownerId : currentUserId;
    if (props.reminder) {
      const patch: ReminderPatch = {};
      if (title.trim() !== props.reminder.title) patch.title = title.trim();
      if (schedule.intervalCount !== props.reminder.intervalCount) patch.intervalCount = schedule.intervalCount;
      if (schedule.intervalUnit !== props.reminder.intervalUnit) patch.intervalUnit = schedule.intervalUnit;
      if (schedule.mode !== props.reminder.mode) patch.mode = schedule.mode;
      if (owner !== props.reminder.ownerId && multiMember) patch.ownerId = owner;
      if (Object.keys(patch).length > 0) props.onUpdate(patch);
    } else {
      props.onAdd({ title: title.trim(), ...schedule, ownerId: owner, firstDueDate: firstDue ? new Date(firstDue) : undefined });
    }
    onClose();
  }

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={reminder ? "Reminder" : "New reminder"}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField
          label="What"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          placeholder="e.g. Water the plants"
          autoFocus={!reminder}
        />
        <ScheduleFields value={schedule} onChange={setSchedule} />
        {!reminder && (
          <TextField label="First due" type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
        )}
        {multiMember && (
          <Field id="reminder-assignee" label="Assigned to">
            <ChoiceChips
              label="Assigned to"
              value={ownerId ?? "everyone"}
              onChange={(v) => setOwnerId(v === "everyone" ? null : v)}
              options={assigneeOptions(members, currentUserId)}
            />
          </Field>
        )}
        {reminder && reminder.completions.length > 0 && (
          <Field id="reminder-history" label="Last done">
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {reminder.completions.map((c) => (
                <li key={c.id}>
                  {new Date(c.completedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  {c.completedBy && ` · ${c.completedBy.name || c.completedBy.email}`}
                </li>
              ))}
            </ul>
          </Field>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="lg" disabled={!valid} className="flex-1">
            {reminder ? "Save" : "Add reminder"}
          </Button>
          {props.reminder && (
            <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={props.onDelete}>
              Delete
            </Button>
          )}
        </div>
      </form>
    </ResponsiveSheet>
  );
}
