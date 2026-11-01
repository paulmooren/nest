import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A list of rows. Boxed on desktop; on a phone there is no outer box, only hairlines between rows
 * (docs/rebuild/MASTER_BRIEF.md 5.4).
 */
export function RowList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "divide-y divide-border/70 md:overflow-hidden md:rounded-2xl md:border md:bg-card",
        className
      )}
      {...props}
    />
  )
}

type RowProps = {
  /** Check, avatar or category dot. */
  leading?: React.ReactNode
  title: React.ReactNode
  /** One line under the title. */
  meta?: React.ReactNode
  /** An amount, a status, or nothing. */
  trailing?: React.ReactNode
  /** Opens the detail sheet. */
  onClick?: () => void
  href?: string
  /** A chevron after the trailing value, for rows that open something. */
  chevron?: boolean
  className?: string
}

/**
 * The one row of the app: leading control, content (title + one meta line), trailing value. The whole row is the
 * tap target. The title and trailing value never truncate against secondary chrome; only the meta line may.
 */
export function Row({ leading, title, meta, trailing, onClick, href, chevron, className }: RowProps) {
  const inner = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium md:text-sm">{title}</span>
        {meta && <span className="block truncate text-sm text-muted-foreground md:text-xs">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0 text-base tabular-nums md:text-sm">{trailing}</span>}
      {chevron && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  )
  const base = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left md:px-5",
    (onClick || href) && "transition-colors hover:bg-muted active:bg-muted",
    className
  )

  return (
    <li>
      {href ? (
        <Link href={href} className={base}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={base}>
          {inner}
        </button>
      ) : (
        <div className={base}>{inner}</div>
      )}
    </li>
  )
}
