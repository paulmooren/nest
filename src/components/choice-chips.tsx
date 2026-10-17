"use client";

import { Button } from "@base-ui/react/button";

export type Choice<T extends string> = { value: T; label: string; leading?: React.ReactNode };

/**
 * A few exclusive choices as 44px chips (a radio group): the touch-friendly stand-in for a small popover menu.
 * Picking one applies it at once.
 */
export function ChoiceChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors ${
              active ? "border-text bg-text text-bg" : "border-transparent bg-surface-2 text-text-muted"
            }`}
          >
            {o.leading}
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

/** A labelled block of a sheet form. */
export function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-text-muted">{label}</span>
      {children}
    </div>
  );
}
