"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type SectionTab = { href: string; label: string }

/**
 * Tabs between the pages of one section (Finance: Budgets / Transactions / Accounts). They are links, so each page
 * keeps its own URL; the current one is marked for assistive technology. Scrolls sideways when they do not fit and
 * keeps the current one in view.
 */
export function SectionTabs({ tabs, label = "Sections" }: { tabs: SectionTab[]; label?: string }) {
  const pathname = usePathname()
  const activeRef = React.useRef<HTMLAnchorElement>(null)

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [pathname])

  return (
    <nav aria-label={label} className="flex items-center gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            ref={active ? activeRef : undefined}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center border-b-2 px-3.5 text-sm font-medium transition-colors md:min-h-10",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
