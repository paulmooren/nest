"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { trpc } from "@/trpc/react";
import { PlusIcon, CloseIcon, CheckIcon } from "@/components/action-icons";
import { AssigneeAvatar } from "@/components/tasks/assignee-avatar";
import { CELL_TEXT } from "@/components/tasks/types";
import { ReminderRow, ScheduleForm, type ReminderData } from "@/components/reminders/reminder-row";
import { useReminderActions } from "@/components/reminders/use-reminders";
import { PopoverPanel } from "@/components/popover-menu";
import { dueBucket, describeSchedule, todayInHousehold, type DueBucket, type ScheduleMode, type ScheduleUnit } from "@/lib/schedule";
import type { Member } from "@/components/tasks/types";

import { useDelayed } from "@/components/use-delayed";
import { PillsSkeleton, RowsSkeleton } from "@/components/ui/skeleton";
export default function RemindersPage() {
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: reminders } = trpc.reminder.list.useQuery();
  const showSkeleton = useDelayed(reminders === undefined);
  if (reminders === undefined)
    return showSkeleton ? (
      <div className="flex flex-col gap-5">
        <PillsSkeleton />
        <RowsSkeleton rows={6} />
      </div>
    ) : null;
  return <RemindersPanel members={household?.members ?? []} currentUserId={me?.id ?? ""} />;
}

const BUCKETS: { key: DueBucket; title: string; titleClass?: string }[] = [
  { key: "overdue", title: "Overdue", titleClass: "text-critical" },
  { key: "today", title: "Due today" },
  { key: "week", title: "This week" },
  { key: "later", title: "Later" },
];

/**
 * Recurring chores, grouped by how soon they're due, with pills to look at
 * everyone's, yours, or one person's. Ticking one off records who did it and
 * schedules the next; a toast offers to undo a mis-tap.
 */
function RemindersPanel({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const { data: reminders } = trpc.reminder.list.useQuery();
  const actions = useReminderActions();
  const [filter, setFilter] = useState<"all" | string>("all");
  const [adding, setAdding] = useState(false);
  const today = todayInHousehold();

  const shown = ((reminders ?? []) as ReminderData[]).filter(
    (r) => filter === "all" || r.ownerId === filter || r.ownerId === null,
  );
  const multiMember = members.length > 1;

  return (
    <section className="md:-mx-6">
      {actions.toast}
      <h2 className="px-6 pb-3 text-[17px] font-semibold">Reminders</h2>

      {multiMember && (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-4" role="group" aria-label="Show reminders for">
          {[{ id: "all", label: "All" }, ...members.map((m) => ({ id: m.user.id, label: m.user.id === currentUserId ? "You" : m.user.name || m.user.email }))].map(
            (p) => (
              <Button
                key={p.id}
                type="button"
                aria-pressed={filter === p.id}
                onClick={() => setFilter(p.id)}
                className={`inline-flex h-11 items-center rounded-full border px-4 text-[14px] md:h-8 md:px-3.5 md:text-[13px] font-medium transition-colors ${
                  filter === p.id
                    ? "border-text bg-text text-bg"
                    : "border-transparent bg-surface-2 text-text-muted hover:bg-border-soft hover:text-text"
                }`}
              >
                {p.label}
              </Button>
            ),
          )}
        </div>
      )}

      {reminders && shown.length === 0 && !adding && (
        <p className="border-b border-border-soft px-6 py-4 text-[13px] text-text-muted">
          Nothing recurring yet — add hoovering, watering the plants, worming the dog…
        </p>
      )}

      {BUCKETS.map(({ key, title, titleClass }) => {
        const inBucket = shown.filter((r) => dueBucket(new Date(r.nextDueDate), today) === key);
        if (inBucket.length === 0) return null;
        return (
          <div key={key}>
            <div className={`px-6 pt-3 pb-1 text-[12px] font-semibold tracking-[0.09em] uppercase ${titleClass ?? "text-text-faint"}`}>
              {title}
            </div>
            {inBucket.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                members={members}
                currentUserId={currentUserId}
                today={today}
                onTick={() => actions.tick(r)}
                onUpdate={(patch) => actions.update.mutate({ id: r.id, ...patch })}
                onDelete={() => actions.remove.mutate({ id: r.id })}
              />
            ))}
          </div>
        );
      })}

      {adding ? (
        <NewReminderRow
          members={members}
          currentUserId={currentUserId}
          onAdd={(values) => actions.create.mutate(values)}
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
          <span className={CELL_TEXT}>New reminder</span>
        </Button>
      )}
    </section>
  );
}

/** "+ New reminder": what, how often, who, and when it's first due (today unless you say otherwise). */
function NewReminderRow({
  members,
  currentUserId,
  onAdd,
  onClose,
}: {
  members: Member[];
  currentUserId: string;
  onAdd: (values: {
    title: string;
    intervalCount: number;
    intervalUnit: ScheduleUnit;
    mode: ScheduleMode;
    ownerId: string | null;
    firstDueDate?: Date;
  }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState<{ intervalCount: number; intervalUnit: ScheduleUnit; mode: ScheduleMode }>({
    intervalCount: 1,
    intervalUnit: "WEEK",
    mode: "FROM_DONE",
  });
  const [ownerId, setOwnerId] = useState<string | null>(currentUserId);
  const multiMember = members.length > 1;

  return (
    <form
      className="flex flex-col gap-3 border-b border-border-soft bg-surface px-6 py-3 last:border-b-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const form = new FormData(e.currentTarget);
        const first = String(form.get("firstDue") || "");
        onAdd({
          title: title.trim(),
          ...schedule,
          ownerId: multiMember ? ownerId : currentUserId,
          firstDueDate: first ? new Date(first) : undefined,
        });
        setTitle("");
        onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
        maxLength={160}
        placeholder="e.g. Water the plants"
        aria-label="New reminder"
        className={`w-full bg-transparent ${CELL_TEXT} font-medium outline-none placeholder:font-normal placeholder:text-text-faint`}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-text-muted">
        <PopoverPanel
          align="left"
          trigger={
            <Button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 font-medium text-text hover:bg-border-soft">
              {describeSchedule(schedule.intervalCount, schedule.intervalUnit)}
            </Button>
          }
        >
          {({ close }) => (
            <ScheduleForm
              initial={schedule}
              onSave={(patch) => {
                setSchedule(patch);
                close();
              }}
            />
          )}
        </PopoverPanel>
        <label className="flex items-center gap-2">
          First due
          <Input
            type="date"
            name="firstDue"
            defaultValue={new Date().toLocaleDateString("en-CA")}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-[12.5px] text-text outline-none focus:border-accent"
          />
        </label>
        {multiMember && (
          <AssigneeAvatar ownerId={ownerId} members={members} currentUserId={currentUserId} onChange={setOwnerId} size={26} />
        )}
        <div className="ml-auto flex items-center gap-3">
          <Button type="submit" aria-label="Add reminder" className="h-4 w-4 shrink-0 text-good hover:opacity-80">
            <CheckIcon />
          </Button>
          <Button type="button" onClick={onClose} aria-label="Cancel" className="h-4 w-4 shrink-0 text-text-muted hover:text-critical">
            <CloseIcon />
          </Button>
        </div>
      </div>
    </form>
  );
}

