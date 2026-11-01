"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Switches on the design-system tokens for a rebuilt page. The wrapper covers the page itself; the class on <body>
 * covers pop-ups, which Base UI portals to <body>, outside any wrapper. Pop-ups only exist after an interaction,
 * so adding the class after mount is never visible. Goes away at cutover, when the tokens move onto :root
 * (see src/app/ds.css).
 */
export function DsScope({ className, children }: { className?: string; children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    document.body.classList.add("ds")
    return () => document.body.classList.remove("ds")
  }, [])

  return <div className={cn("ds font-sans text-foreground", className)}>{children}</div>
}
