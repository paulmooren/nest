"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";

import { ChevronDownIcon } from "@/components/action-icons";

/** `YYYY-MM-DD` as a local date, so the calendar shows the day that was meant whatever the time zone. */
function parse(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}

function format(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const SHOWN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short" });

const NAV_BUTTON =
  "flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <span className={`block h-4 w-4 ${direction === "left" ? "rotate-90" : "-rotate-90"}`}>
      <ChevronDownIcon />
    </span>
  );
}

/**
 * A date as `YYYY-MM-DD`, chosen from a calendar in a popover (Base UI has no date picker, so the calendar grid
 * is react-day-picker and the popover is Base UI's). The caption opens a month and year switcher.
 */
export function DatePicker({
  value,
  onChange,
  "aria-label": label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const [view, setView] = useState<"days" | "months">("days");
  const step = (months: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + months, 1));

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setMonth(selected ?? new Date());
          setView("days");
        }
      }}
    >
      <Popover.Trigger
        aria-label={`${label}${selected ? `: ${SHOWN.format(selected)}` : ""}`}
        className={`inline-flex items-center gap-1.5 rounded-md border border-border-soft bg-surface px-2 py-0.5 text-[12px] text-text outline-none hover:bg-surface-hover focus-visible:border-text-faint ${className}`}
      >
        {selected ? SHOWN.format(selected) : "Pick a date"}
        <span aria-hidden className="block h-3 w-3 text-text-faint">
          <ChevronDownIcon />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} collisionPadding={8} className="z-50 outline-none">
          <Popover.Popup className="w-[17.5rem] rounded-xl border border-border-soft bg-surface p-3 shadow-xl outline-none">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label={view === "days" ? "Previous month" : "Previous year"}
                onClick={() => step(view === "days" ? -1 : -12)}
                className={NAV_BUTTON}
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                aria-live="polite"
                onClick={() => setView(view === "days" ? "months" : "days")}
                className="rounded-md px-2 py-1 text-[13.5px] font-semibold hover:bg-surface-hover"
              >
                {view === "days" ? MONTH_YEAR.format(month) : month.getFullYear()}
              </button>
              <button
                type="button"
                aria-label={view === "days" ? "Next month" : "Next year"}
                onClick={() => step(view === "days" ? 1 : 12)}
                className={NAV_BUTTON}
              >
                <Chevron direction="right" />
              </button>
            </div>

            {view === "months" ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMonth(new Date(month.getFullYear(), i, 1));
                      setView("days");
                    }}
                    className={`rounded-md py-2 text-[13px] hover:bg-surface-hover ${
                      i === month.getMonth() ? "bg-surface-2 font-semibold" : "text-text-muted"
                    }`}
                  >
                    {MONTH_SHORT.format(new Date(2000, i, 1))}
                  </button>
                ))}
              </div>
            ) : (
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(format(date));
                  setOpen(false);
                }}
                month={month}
                onMonthChange={setMonth}
                hideNavigation
                weekStartsOn={1}
                showOutsideDays
                classNames={{
                  root: "w-full",
                  month_caption: "hidden",
                  month_grid: "w-full border-collapse",
                  weekday: "pb-1 text-center text-[11.5px] font-medium text-text-faint",
                  day: "p-0 text-center",
                  day_button:
                    "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-[13px] outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-text-faint",
                  today: "font-bold text-accent",
                  selected: "[&>button]:bg-accent-fill [&>button]:text-accent-ink [&>button:hover]:bg-accent-fill",
                  outside: "text-text-faint",
                }}
              />
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
