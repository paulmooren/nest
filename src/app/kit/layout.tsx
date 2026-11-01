import { notFound } from "next/navigation"
import { HomeIcon, ListChecksIcon, WalletIcon } from "lucide-react"

import { AppShell } from "@/components/ds/app-shell"

export const metadata = { title: "Kitchen sink" }

/**
 * Visual proof page for the rebuilt design system (docs/rebuild/MASTER_BRIEF.md step 1). Not part of the product:
 * it does not exist in production builds.
 */
export default function KitLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound()

  return (
    <div className="font-sans text-foreground">
      <AppShell
        items={[
          { href: "/kit", label: "Dashboard", icon: <HomeIcon /> },
          { href: "/kit/finance", label: "Finance", icon: <WalletIcon /> },
          { href: "/kit/tasks", label: "Tasks", icon: <ListChecksIcon /> },
        ]}
      >
        {children}
      </AppShell>
    </div>
  )
}
