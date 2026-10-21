"use client";

import { useRender } from "@base-ui/react/use-render";

/**
 * A quiet grey block that pulses (static for people who ask for less motion): the building piece of every loading
 * screen. Decorative, so hidden from screen readers. Size it with classes; `render` swaps the element, as on
 * Base UI's own parts.
 */
export function Skeleton({ render, className = "", ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    render,
    defaultTagName: "div",
    props: {
      "aria-hidden": true,
      ...props,
      className: `animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none ${className}`,
    },
  });
}

/** Wraps a loading screen: announced once as "Loading…" and laid out like the page it stands in for. */
export function LoadingScreen({ children, className = "flex flex-col gap-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** A card in the shape of the dashboard's and lists' cards: a heading line, then `rows` rows. */
export function CardBones({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border-soft bg-surface">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="border-t border-border-soft">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border-soft px-6 py-3.5 last:border-b-0">
            <Skeleton className="h-4 w-4 shrink-0 rounded-[4px]" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="hidden h-3.5 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** `rows` list rows, boxed on desktop only (phones show lists without an outer box). */
export function RowsSkeleton({ rows = 5, boxed = true }: { rows?: number; boxed?: boolean }) {
  return (
    <div className={boxed ? "md:overflow-hidden md:rounded-[20px] md:border md:border-border-soft md:bg-surface" : ""}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-[60px] items-center gap-3 border-b border-border-soft px-1 py-2.5 last:border-b-0 md:px-6">
          <Skeleton className="h-8 w-8 shrink-0 rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A row of filter pills (All / You / partner…). */
export function PillsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-full md:h-8" />
      ))}
    </div>
  );
}

/** A settings page: a heading, then `fields` labelled inputs, then a button. The settings pages are all short forms. */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-28 rounded-xl" />
    </div>
  );
}
