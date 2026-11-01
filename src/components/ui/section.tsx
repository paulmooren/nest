import * as React from "react"

import { cn } from "@/lib/utils"

/** A titled block of a page body. Unboxed: sections are separated by space, boxes are for rows. */
export function Section({
  title,
  label,
  description,
  className,
  children,
}: {
  /** Omit when the page title already says it; then pass `label` for assistive technology. */
  title?: React.ReactNode
  label?: string
  description?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const id = React.useId()
  return (
    <section
      aria-labelledby={title ? id : undefined}
      aria-label={title ? undefined : label}
      className={cn("flex flex-col gap-4", className)}
    >
      {(title || description) && (
        <div>
          {title && (
            <h2 id={id} className="text-lg font-semibold">
              {title}
            </h2>
          )}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
