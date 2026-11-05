"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { daysBetween, describeSchedule, dueLabel, todayInHousehold } from "@/lib/schedule";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Row } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReminderData } from "@/components/reminders/types";
import { useReminderActions } from "@/components/reminders/use-reminders";
import { TICK_GRACE_MS, useShoppingActions, useShoppingItems, useTickGrace } from "@/components/shopping/use-shopping";
import { assigneeLabel } from "@/components/tasks/members";
import { PRIORITIES, PRIORITY_ORDER } from "@/components/tasks/priority";
import { TodoSheet } from "@/components/tasks/todo-sheet";
import type { Member, Task } from "@/components/tasks/types";
import { useTaskActions } from "@/components/tasks/use-tasks";

type Key = "reminders" | "todos" | "groceries";

/** An open section shows this many rows; the rest is one tap away on its own page. */
const ROWS = 5;
/** Reminders due within this many days count as "coming up", overdue ones included. */
const WINDOW_DAYS = 7;
const STORAGE_KEY = "nest.today.sections";

// The remembered open/closed choices, read from browser storage without touching it on the server: the server and
// the first client render both see "nothing remembered", and the stored value arrives right after.
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}
function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

const titles = (names: string[]) => names.slice(0, 3).join(", ");

/**
 * The three lists on Today as one card of collapsible sections: Reminders, Todos and Groceries, each with a one-line
 * summary while closed. Sections open and close on their own. The first section with something urgent starts open
 * (decided once, so ticking the last overdue Reminder does not make the page jump), and a Member's own choice is
 * remembered on the device. An empty list stays as a closed row, so each list is still one tap away.
 */
export function TodayLists({ tasks: showTasks, shopping: showShopping }: { tasks: boolean; shopping: boolean }) {
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const { data: todoRows } = trpc.task.list.useQuery(undefined, { enabled: showTasks });
  const { data: reminderRows } = trpc.reminder.list.useQuery(undefined, { enabled: showTasks });
  const { data: lists } = trpc.shopping.lists.useQuery(undefined, { enabled: showShopping });
  const main = lists?.find((l) => l.ownerId === null) ?? lists?.[0];
  const { data: items } = useShoppingItems(main?.id);

  const reminderActions = useReminderActions();
  const taskActions = useTaskActions();
  const shoppingActions = useShoppingActions(main?.id);
  const ticks = useTickGrace();

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Open state, strongest first: a choice made on this page, one remembered on this device, and the rule, which is
  // applied once when the data first arrives.
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const remembered = useMemo<Partial<Record<Key, boolean>>>(() => {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [raw]);
  const [chosen, setChosen] = useState<Partial<Record<Key, boolean>>>({});
  const [auto, setAuto] = useState<Key | null | undefined>(undefined);

  const ready =
    !!me &&
    (!showTasks || (!!todoRows && !!reminderRows)) &&
    (!showShopping || (!!lists && (!main || !!items)));

  const today = todayInHousehold();
  const mine = <T extends { ownerId: string | null }>(rows: T[]) =>
    rows.filter((r) => r.ownerId === null || r.ownerId === me?.id);

  const reminders = showTasks
    ? mine((reminderRows ?? []) as ReminderData[])
        .filter((r) => daysBetween(today, new Date(r.nextDueDate)) <= WINDOW_DAYS)
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime() || a.title.localeCompare(b.title))
    : [];
  const days = (r: ReminderData) => daysBetween(today, new Date(r.nextDueDate));
  const overdue = reminders.filter((r) => days(r) < 0).length;
  const dueToday = reminders.filter((r) => days(r) === 0).length;
  const thisWeek = reminders.length - overdue - dueToday;

  const todos = showTasks
    ? mine((todoRows ?? []) as Task[])
        .filter((t) => !t.completedAt || justCompleted.has(t.id))
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    : [];
  const openTodos = todos.filter((t) => !t.completedAt);

  const groceries = showShopping ? (items ?? []).filter((i) => !i.checkedAt || ticks.leaving.has(i.id)) : [];
  const toBuy = groceries.filter((i) => !i.checkedAt);

  if (ready && auto === undefined) {
    setAuto(overdue + dueToday > 0 ? "reminders" : openTodos.length > 0 ? "todos" : toBuy.length > 0 ? "groceries" : null);
  }

  if (!ready) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Loading…</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const isOpen = (key: Key) => chosen[key] ?? remembered[key] ?? auto === key;
  function toggle(key: Key) {
    const open = !isOpen(key);
    setChosen({ ...chosen, [key]: open });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...remembered, [key]: open }));
      listeners.forEach((callback) => callback());
    } catch {
      // Private mode or blocked storage: the choice still holds until the page is left.
    }
  }

  const members: Member[] = household?.members ?? [];
  const multiMember = members.length > 1;
  const task = (todoRows as Task[] | undefined)?.find((t) => t.id === editingTask);

  const more = (shown: number, total: number, label: string, href: string) => (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground md:px-5"
    >
      {total > shown ? `+ ${total - shown} more · ` : ""}
      {label}
    </Link>
  );

  return (
    <>
      {reminderActions.toast}
      <div className="divide-y divide-border/70 md:overflow-hidden md:rounded-2xl md:border md:bg-card">
        {showTasks && (
          <Section
            id="reminders"
            name="Reminders"
            open={isOpen("reminders")}
            onToggle={() => toggle("reminders")}
            summary={
              reminders.length === 0 ? (
                "Nothing due"
              ) : (
                <>
                  {overdue > 0 && <span className="font-medium text-destructive">{overdue} overdue</span>}
                  {overdue > 0 && (dueToday > 0 || thisWeek > 0) && ", "}
                  {dueToday > 0 && <span>{dueToday} due today</span>}
                  {dueToday > 0 && thisWeek > 0 && ", "}
                  {thisWeek > 0 && <span>{thisWeek} this week</span>}
                </>
              )
            }
          >
            <ul className="divide-y divide-border/70">
              {reminders.slice(0, ROWS).map((r) => (
                <Row
                  key={r.id}
                  check={{ checked: false, onChange: () => reminderActions.tick(r), label: `Mark ${r.title} as done` }}
                  title={r.title}
                  href="/tasks/reminders"
                  meta={
                    <>
                      <span className={days(r) < 0 ? "font-medium text-destructive" : "font-medium text-foreground"}>
                        {dueLabel(new Date(r.nextDueDate), today)}
                      </span>
                      {` · ${describeSchedule(r.intervalCount, r.intervalUnit)}`}
                    </>
                  }
                />
              ))}
            </ul>
            {more(Math.min(ROWS, reminders.length), reminders.length, "View all", "/tasks/reminders")}
          </Section>
        )}

        {showTasks && (
          <Section
            id="todos"
            name="Todos"
            open={isOpen("todos")}
            onToggle={() => toggle("todos")}
            summary={
              openTodos.length === 0
                ? "No open todos"
                : `${openTodos.length} open · ${titles(openTodos.map((t) => t.title))}`
            }
          >
            <ul className="divide-y divide-border/70">
              {todos.slice(0, ROWS).map((t) => {
                const done = !!t.completedAt;
                const priority = PRIORITIES.find((p) => p.value === t.priority)!;
                return (
                  <Row
                    key={t.id}
                    check={{
                      checked: done,
                      onChange: () => {
                        if (!done) setJustCompleted((prev) => new Set(prev).add(t.id));
                        taskActions.toggle(t.id);
                      },
                      label: done ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`,
                    }}
                    title={t.title}
                    done={done}
                    meta={
                      <span className="inline-flex items-center gap-1.5">
                        <span className="block size-2 rounded-full" style={{ background: priority.dot }} aria-hidden />
                        {priority.label}
                        {multiMember && me && ` · ${assigneeLabel(t.ownerId, members, me.id)}`}
                      </span>
                    }
                    onClick={() => setEditingTask(t.id)}
                  />
                );
              })}
            </ul>
            {more(Math.min(ROWS, todos.length), todos.length, "View all", "/tasks/todos")}
          </Section>
        )}

        {showShopping && main && (
          <Section
            id="groceries"
            name={main.name}
            open={isOpen("groceries")}
            onToggle={() => toggle("groceries")}
            summary={
              toBuy.length === 0
                ? "Nothing on the list"
                : `${toBuy.length} ${toBuy.length === 1 ? "item" : "items"} · ${titles(toBuy.map((i) => i.name))}`
            }
          >
            <ul className="divide-y divide-border/70">
              {groceries.slice(0, ROWS).map((item) => {
                const checked = !!item.checkedAt;
                const leaving = ticks.leaving.has(item.id);
                return (
                  <Row
                    key={item.id}
                    check={{
                      checked,
                      onChange: () => {
                        if (!checked) ticks.start(item.id);
                        else ticks.cancel(item.id);
                        shoppingActions.setChecked.mutate({ id: item.id, checked: !checked });
                      },
                      label: checked ? `Put ${item.name} back on the list` : `Tick off ${item.name}`,
                    }}
                    title={item.name}
                    done={checked}
                    trailing={item.quantity ?? undefined}
                    rowClassName={leaving && checked ? "shopping-leave" : undefined}
                    rowStyle={leaving && checked ? { animationDuration: `${TICK_GRACE_MS}ms` } : undefined}
                  />
                );
              })}
            </ul>
            {more(Math.min(ROWS, groceries.length), groceries.length, "Open list", "/lists/shopping")}
          </Section>
        )}
      </div>

      {task && me && (
        <TodoSheet
          task={task}
          members={members}
          currentUserId={me.id}
          onUpdate={(values) => taskActions.update(task.id, values)}
          onDelete={() => {
            setEditingTask(null);
            setDeletingTask(task);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
      <ConfirmDelete
        open={!!deletingTask}
        onOpenChange={(o) => !o && setDeletingTask(null)}
        title={`Delete "${deletingTask?.title ?? ""}"?`}
        onConfirm={() => deletingTask && taskActions.remove(deletingTask.id)}
      />
    </>
  );
}

/** One collapsible section: a header button with the name and a one-line summary, and the rows when open. */
function Section({
  id,
  name,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  name: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 className="text-base font-semibold">
        <button
          type="button"
          id={`${id}-title`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted active:bg-muted md:px-5"
        >
          {open ? (
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="shrink-0 text-base font-medium md:text-sm">{name}</span>
          <span className={cn("min-w-0 flex-1 truncate text-sm font-normal text-muted-foreground md:text-xs")}>{summary}</span>
        </button>
      </h2>
      {open && (
        <div id={`${id}-panel`} className="pb-2 md:px-0">
          {children}
        </div>
      )}
    </section>
  );
}
