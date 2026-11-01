"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHEDULE_UNITS, unitLabel, type ScheduleMode, type ScheduleUnit } from "@/lib/schedule";

export type Schedule = { intervalCount: number; intervalUnit: ScheduleUnit; mode: ScheduleMode };

/** The few fields that make up a Schedule: how many, which unit, and what it counts from. */
export function ScheduleFields({ value, onChange }: { value: Schedule; onChange: (value: Schedule) => void }) {
  const n = Math.max(1, value.intervalCount);
  const units = SCHEDULE_UNITS.map((u) => ({ value: u, label: unitLabel(u, n) }));

  return (
    <div className="flex flex-col gap-5">
      <Field id="schedule-count" label="Repeats every">
        <div className="flex gap-2">
          <Input
            id="schedule-count"
            value={String(value.intervalCount)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              onChange({ ...value, intervalCount: digits ? parseInt(digits, 10) : 0 });
            }}
            onBlur={() => value.intervalCount < 1 && onChange({ ...value, intervalCount: 1 })}
            inputMode="numeric"
            className="w-20 text-center"
          />
          <Select
            items={units}
            value={value.intervalUnit}
            onValueChange={(u) => u && onChange({ ...value, intervalUnit: u as ScheduleUnit })}
          >
            <SelectTrigger aria-label="Unit" className="flex-1">
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
      </Field>
      <Field id="schedule-mode" label="Count from">
        <ChoiceChips
          label="Count from"
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
          options={[
            { value: "FROM_DONE", label: "When it was done" },
            { value: "FIXED", label: "A fixed rhythm" },
          ]}
        />
      </Field>
    </div>
  );
}
