"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The look of every chip in the app (a choice, a filter, a toggle): 36px tall with a 44px hit area, the same corner
 * as buttons and fields. Selected is the ink fill; unselected is the quiet fill.
 */
export function chipClass(active: boolean) {
  return cn(
    "relative inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors after:absolute after:-inset-y-[5px] after:inset-x-0 after:content-['']",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
  )
}

export type Choice<T extends string> = { value: T; label: string; leading?: React.ReactNode }

/**
 * A few exclusive choices as 44px chips (a radio group): the touch-friendly stand-in for a small menu.
 * Picking one applies it at once.
 */
export function ChoiceChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | null
  options: Choice<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={chipClass(active)}
          >
            {o.leading}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
