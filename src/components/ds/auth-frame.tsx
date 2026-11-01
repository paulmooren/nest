import * as React from "react"

import { cn } from "@/lib/utils"
import { DemoBadge } from "@/components/demo-badge"

function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[30px] items-center justify-center rounded-[9px] bg-primary font-heading text-base font-bold text-primary-foreground",
        className
      )}
    >
      N
    </span>
  )
}

/**
 * The frame for screens before you are in the app (sign in, sign up, household setup): the grey shell with one white
 * panel and the form centred in it. The one `main` landmark of these screens.
 */
export function AuthFrame({
  children,
  width = "max-w-[380px]",
}: {
  children: React.ReactNode
  width?: string
}) {
  return (
    <div className="relative min-h-dvh bg-sidebar md:p-3">
      <div className="absolute top-8 left-8 hidden items-center gap-2.5 md:flex">
        <Mark />
        <span className="font-heading text-[17px] font-bold tracking-tight">Nest</span>
      </div>
      <div className="absolute top-7 right-8 z-10 hidden md:block">
        <DemoBadge />
      </div>
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 md:min-h-[calc(100dvh-1.5rem)] md:rounded-3xl">
        <main className={cn("w-full", width)}>{children}</main>
      </div>
    </div>
  )
}

/** Eyebrow and the page's one <h1>; on a phone the mark sits above, since the frame's wordmark is desktop only. */
export function AuthHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <Mark className="mb-6 size-[38px] rounded-[11px] text-xl md:hidden" />
      <p className="mb-2 text-xs font-semibold tracking-[0.11em] text-muted-foreground uppercase">{eyebrow}</p>
      <h1 className="font-heading text-[26px] font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  )
}

/** A message above a form: an error (read out when it appears) or a quiet note. */
export function AuthNotice({
  tone = "note",
  children,
}: {
  tone?: "note" | "error"
  children: React.ReactNode
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-4 rounded-lg border px-3.5 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {children}
    </p>
  )
}
