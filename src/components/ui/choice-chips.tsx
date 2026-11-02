"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

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
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-base font-medium transition-colors md:min-h-9 md:text-sm",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {o.leading}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
