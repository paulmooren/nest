import * as React from "react"

/** One sentence and one primary action: what an empty list says. */
export function EmptyState({
  title,
  action,
}: {
  title: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <p className="text-base text-muted-foreground">{title}</p>
      {action}
    </div>
  )
}
