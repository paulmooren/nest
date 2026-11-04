import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

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

/**
 * How a tappable row answers a hover or keyboard focus: its title underlines, nothing else moves or fills. Put
 * `group/row` on the hoverable element and this on the title.
 */
export const ROW_TITLE_HOVER =
  "decoration-foreground/60 decoration-1 underline-offset-4 group-hover/row:underline group-focus-visible/row:underline"

type RowProps = {
  /** Check, avatar or category dot. */
  leading?: React.ReactNode
  /** A tick box in front of the row. It is its own control, so ticking never opens the row. */
  check?: { checked: boolean; onChange: () => void; label: string }
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
  /** Let the meta line wrap instead of cutting it off, when it is a sentence the person needs to read. */
  wrapMeta?: boolean
  /** The title shows as finished: struck through and quiet. */
  done?: boolean
  className?: string
  /** On the <li>, for an effect that covers the whole row (a fade-out). */
  rowClassName?: string
  rowStyle?: React.CSSProperties
}

/**
 * The one row of the app: leading control, content (title + one meta line), trailing value. The whole row is the
 * tap target. The title and trailing value never truncate against secondary chrome; only the meta line may.
 */
export function Row({
  leading,
  check,
  title,
  meta,
  trailing,
  onClick,
  href,
  chevron,
  wrapMeta,
  done,
  className,
  rowClassName,
  rowStyle,
}: RowProps) {
  const interactive = !!(onClick || href)
  const inner = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-base font-medium md:text-sm",
            interactive && ROW_TITLE_HOVER,
            done && "text-muted-foreground line-through"
          )}
        >
          {title}
        </span>
        {meta && (
          <span className={cn("block text-sm text-muted-foreground md:text-xs", !wrapMeta && "truncate")}>{meta}</span>
        )}
      </span>
      {trailing && <span className="shrink-0 text-base tabular-nums md:text-sm">{trailing}</span>}
      {chevron && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  )
  const main = cn(
    "flex min-h-14 w-full min-w-0 flex-1 items-center gap-3 py-3 text-left",
    check ? "pr-0 md:pr-5" : "px-0 md:px-5",
    interactive && "group/row active:opacity-70",
    className
  )

  const body = href ? (
    <Link href={href} className={main}>
      {inner}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className={main}>
      {inner}
    </button>
  ) : (
    <div className={main}>{inner}</div>
  )

  if (!check)
    return (
      <li className={rowClassName} style={rowStyle}>
        {body}
      </li>
    )

  return (
    <li className={cn("flex items-stretch", rowClassName)} style={rowStyle}>
      <span className="flex w-10 shrink-0 items-center justify-start md:w-14 md:justify-center md:pl-3">
        <Checkbox
          checked={check.checked}
          onCheckedChange={check.onChange}
          aria-label={check.label}
          className="rounded-md"
        />
      </span>
      {body}
    </li>
  )
}
