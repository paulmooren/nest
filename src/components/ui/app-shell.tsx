"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export type NavItem = {
  href: string
  label: string
  icon?: React.ReactNode
}

function NavLinks({
  items,
  onNavigate,
  className,
}: {
  items: NavItem[]
  onNavigate?: () => void
  className?: string
}) {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-xl px-3 text-base transition-colors md:min-h-10 md:text-sm",
              active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="size-[18px] shrink-0 [&_svg]:size-full" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * The frame of the app: a grey shell (sidebar) around one white content panel. Desktop: fixed 240px sidebar and a
 * rounded floating panel. Phone: the panel runs edge to edge under a sticky top bar whose burger opens the same
 * links in a left sheet. Pages put their title in `PageHeader`, not here.
 */
export function AppShell({
  items,
  brand = "Nest",
  account,
  badge,
  children,
}: {
  items: NavItem[]
  brand?: string
  /** Footer slot of the sidebar/drawer: the profile link, sign-out. */
  account?: React.ReactNode
  /** Beside the wordmark: the Demo marker. */
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex min-h-dvh bg-sidebar">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col px-5 pt-7 pb-5 md:flex">
        <div className="mb-9 flex flex-wrap items-center gap-2 px-2">
          <span className="font-heading text-lg font-bold tracking-tight">{brand}</span>
          {badge}
        </div>
        <NavLinks items={items} />
        <div className="flex-1" />
        {account}
      </aside>

      <div className="w-full min-w-0 md:ml-60 md:py-3 md:pr-3">
        <header className="pt-safe sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu" className="-ml-3.5" />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" className="p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
              <div className="flex-1" />
              {account}
            </SheetContent>
          </Sheet>
          <span className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold tracking-tight">{brand}</span>
            {badge}
          </span>
        </header>

        <main className="min-h-[calc(100dvh-3.5rem)] bg-background px-4 pt-6 pb-28 md:min-h-[calc(100dvh-1.5rem)] md:rounded-3xl md:px-10 md:pt-9 md:pb-14">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
