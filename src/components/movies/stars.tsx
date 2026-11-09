"use client";

import { StarHalfIcon, StarIcon } from "lucide-react";

import { starsLabel } from "@/lib/movies";
import { cn } from "@/lib/utils";

/** One star of five, drawn empty, half or full for a rating in half stars. */
function Star({ index, halfStars, className }: { index: number; halfStars: number; className?: string }) {
  const filled = halfStars - index * 2;
  return (
    <span className={cn("relative inline-flex", className)} aria-hidden>
      <StarIcon className="size-full text-muted-foreground/40" />
      {filled >= 2 && <StarIcon className="absolute inset-0 size-full fill-current" />}
      {filled === 1 && <StarHalfIcon className="absolute inset-0 size-full fill-current" />}
    </span>
  );
}

/** A rating, read-only: five small stars and the number for screen readers. */
export function Stars({ halfStars, className }: { halfStars: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${starsLabel(halfStars)} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} index={i} halfStars={halfStars} className="size-3.5" />
      ))}
    </span>
  );
}

/**
 * Give a rating in half stars. Tapping a star gives it whole; tapping the same star again makes it a half; a third
 * tap takes the rating away. Arrow keys move by half a star.
 */
export function StarPicker({ value, onChange }: { value: number | null; onChange: (halfStars: number | null) => void }) {
  const current = value ?? 0;
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Your rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={current / 2}
      aria-valuetext={value === null ? "Not rated" : `${starsLabel(current)} out of 5 stars`}
      className="inline-flex items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(10, current + 1));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(current <= 1 ? null : current - 1);
        }
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const whole = (i + 1) * 2;
        return (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-hidden
            className="flex size-11 items-center justify-center"
            onClick={() => onChange(current === whole ? whole - 1 : current === whole - 1 ? null : whole)}
          >
            <Star index={i} halfStars={current} className="size-8" />
          </button>
        );
      })}
      <span className="ml-1 min-w-10 text-sm text-muted-foreground tabular-nums">{value === null ? "" : starsLabel(current)}</span>
    </div>
  );
}
