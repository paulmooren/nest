import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Title row of a page. The one <h1>. Actions sit to the right on desktop; on a phone they float in the thumb zone
 * above the home indicator so one hand reaches them. The floating box only exists when there are actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-8", className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="fixed right-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-2 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur md:static md:z-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          {actions}
        </div>
      )}
    </div>
  )
}

/** Vertical rhythm of a page body: 24px between blocks on a phone, 32px on desktop. Opens with an unboxed element. */
export function PageBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-6 md:gap-8", className)} {...props} />
}
