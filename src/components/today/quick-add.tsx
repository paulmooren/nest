"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { SCHEDULE_UNITS, unitLabel, type ScheduleUnit } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReminderActions } from "@/components/reminders/use-reminders";
import { useShoppingActions } from "@/components/shopping/use-shopping";
import { useTaskActions } from "@/components/tasks/use-tasks";
import { useModules } from "@/components/use-modules";

type Kind = "todo" | "shopping" | "reminder";

/**
 * Quick add (see CONTEXT.md): one line that creates a Todo, a Shopping item or a Reminder without leaving Today.
 * Only kinds whose Module is on are offered. A Todo is yours at Medium priority, a Shopping item goes on the main
 * Shared list, and a Reminder is yours, counted from when it was done and first due today. Afterwards the line clears
 * and keeps its kind, so several can be added in a row; the new row appears in the card below.
 */
export function QuickAdd() {
  const { isEnabled } = useModules();
  const { data: me } = trpc.user.me.useQuery();
  const { data: lists } = trpc.shopping.lists.useQuery(undefined, { enabled: isEnabled("shopping") });
  const main = lists?.find((l) => l.ownerId === null) ?? lists?.[0];

  const tasks = useTaskActions();
  const shopping = useShoppingActions(main?.id);
  const reminders = useReminderActions();

  const kinds: { value: Kind; label: string }[] = [
    ...(isEnabled("tasks") ? [{ value: "todo" as const, label: "Todo" }] : []),
    ...(isEnabled("shopping") ? [{ value: "shopping" as const, label: "Shopping item" }] : []),
    ...(isEnabled("tasks") ? [{ value: "reminder" as const, label: "Reminder" }] : []),
  ];
  const [chosen, setChosen] = useState<Kind>("todo");
  const [text, setText] = useState("");
  const [every, setEvery] = useState<{ count: number; unit: ScheduleUnit }>({ count: 1, unit: "WEEK" });

  if (kinds.length === 0 || !me) return null;
  const kind = kinds.some((k) => k.value === chosen) ? chosen : kinds[0].value;
  const title = text.trim();
  const n = Math.max(1, every.count);
  const units = SCHEDULE_UNITS.map((u) => ({ value: u, label: unitLabel(u, n) }));

  const placeholder =
    kind === "todo"
      ? "Add a todo"
      : kind === "shopping"
        ? `Add an item to ${main?.name ?? "the list"}`
        : "Add a reminder, e.g. Water the plants";
  // A Shopping item needs its list; until the lists have loaded there is nowhere to put it.
  const canAdd = !!title && (kind !== "shopping" || !!main);

  function add() {
    if (!canAdd) return;
    if (kind === "todo") tasks.create({ title, priority: "MEDIUM", ownerId: me!.id });
    else if (kind === "shopping") shopping.addItem.mutate({ listId: main!.id, name: title });
    else reminders.create.mutate({ title, intervalCount: n, intervalUnit: every.unit, mode: "FROM_DONE", ownerId: me!.id });
    setText("");
  }

  return (
    <form
      aria-label="Quick add"
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={kind === "shopping" ? 120 : 160}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          enterKeyHint="done"
        />
        <Button type="submit" disabled={!canAdd}>
          Add
        </Button>
      </div>
      {kinds.length > 1 && <ChoiceChips label="What to add" value={kind} options={kinds} onChange={setChosen} />}
      {kind === "reminder" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Every</span>
          <Input
            value={String(every.count)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              setEvery({ ...every, count: digits ? parseInt(digits, 10) : 0 });
            }}
            onBlur={() => every.count < 1 && setEvery({ ...every, count: 1 })}
            inputMode="numeric"
            aria-label="Repeats every"
            className="w-16 text-center"
          />
          <Select
            items={units}
            value={every.unit}
            onValueChange={(u) => u && setEvery({ ...every, unit: u as ScheduleUnit })}
          >
            <SelectTrigger aria-label="Unit" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </form>
  );
}
