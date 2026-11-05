"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  ListIcon,
  ListChecksIcon,
  LockKeyholeIcon,
  WalletIcon,
} from "lucide-react"

import { trpc } from "@/trpc/react"
import { Avatar } from "@/components/avatar"
import { DemoBadge } from "@/components/demo-badge"
import { AppShell, type NavItem } from "@/components/ui/app-shell"
import { NotificationCentre } from "@/components/notifications/notification-centre"
import { useModules } from "@/components/use-modules"
import type { ModuleKey } from "@/lib/modules"

// `modules` ties an item to Household-switchable Modules (shown if any is on); items without one are always shown.
const ALL_NAV_ITEMS: (NavItem & { modules?: ModuleKey[] })[] = [
  { href: "/today", label: "Today", icon: <HomeIcon /> },
  { href: "/finance", label: "Finance", icon: <WalletIcon />, modules: ["finance"] },
  { href: "/tasks", label: "Tasks", icon: <ListChecksIcon />, modules: ["tasks"] },
  { href: "/lists", label: "Lists", icon: <ListIcon />, modules: ["shopping", "wishlist"] },
  { href: "/vault", label: "Vault", icon: <LockKeyholeIcon />, modules: ["vault"] },
]

/** The signed-in app frame: navigation filtered by the Household's Modules, and the way into Settings. */
export function NavShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: me } = trpc.user.me.useQuery()
  const { isEnabled } = useModules()
  const items = ALL_NAV_ITEMS.filter((item) => !item.modules || item.modules.some(isEnabled))
  const inSettings = pathname === "/settings" || pathname.startsWith("/settings/")
  // The phone's top bar names the section you are in. Every page also has its own <h1>, which is what is read out.
  const section = [...items, { href: "/settings", label: "Settings" }].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )

  return (
    <AppShell
      items={items}
      title={section?.label}
      badge={<DemoBadge />}
      actions={
        <>
          <NotificationCentre />
          <Link
            href="/settings"
            aria-label={`Your profile and settings (${userName})`}
            aria-current={inSettings ? "page" : undefined}
            className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted aria-[current=page]:bg-muted md:size-9"
          >
            <Avatar name={userName} image={me?.image} size={28} />
          </Link>
        </>
      }
    >
      {children}
    </AppShell>
  )
}
