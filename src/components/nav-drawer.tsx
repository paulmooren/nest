"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";

import { Avatar } from "@/components/avatar";
import { signOutAction } from "@/app/(app)/settings/actions";

export type DrawerItem = { href: string; label: string; Icon: (props: { active?: boolean }) => React.ReactElement };

const ROW = "flex min-h-14 items-center gap-4 rounded-xl px-3 text-[18px]";

/**
 * The phone's navigation: a burger button at the right of the title bar that opens a full-screen menu with every
 * destination, the way into Settings (the account row) and sign-out. (A bottom tab bar fights the mobile browser's
 * own bottom controls.) Built on the Base UI Dialog, so focus is trapped inside, Escape closes it and focus
 * returns to the button.
 */
export function NavDrawer({
  items,
  userName,
  image,
}: {
  items: DrawerItem[];
  userName: string;
  image?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const settingsActive = pathname.startsWith("/settings");

  // Following a link closes the drawer (the page changes under it).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open menu"
        className="-mr-2 flex h-[var(--tap)] w-[var(--tap)] shrink-0 items-center justify-center rounded-xl text-text hover:bg-surface-2 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 flex h-dvh w-full flex-col bg-bg outline-none transition duration-150 data-ending-style:translate-y-1 data-ending-style:opacity-0 data-starting-style:translate-y-1 data-starting-style:opacity-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent-fill">
                <span className="font-display text-[16px] font-bold text-accent-ink">N</span>
              </div>
              <Dialog.Title className="font-display text-[17px] font-bold tracking-tight">Nest</Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close menu"
              className="-mr-2 flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-full text-text-muted hover:bg-surface-2"
            >
              ✕
            </Dialog.Close>
          </div>

          <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
            <div className="flex flex-col gap-0.5">
              {items.map(({ href, label, Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`${ROW} ${active ? "font-semibold text-text" : "font-medium text-text-muted"}`}
                  >
                    <span className="block h-6 w-6 shrink-0">
                      <Icon active={active} />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>

          </nav>

          <div className="flex items-center gap-2 border-t border-border-soft px-3 pt-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
            <Link
              href="/settings"
              aria-current={settingsActive ? "page" : undefined}
              className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3"
            >
              <span className={`rounded-full ${settingsActive ? "ring-2 ring-text ring-offset-2 ring-offset-bg" : ""}`}>
                <Avatar name={userName} image={image} size={32} />
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-[16px] ${settingsActive ? "font-semibold text-text" : "font-medium"}`}>
                  {userName}
                </span>
                <span className="block text-[13px] text-text-muted">Settings</span>
              </span>
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="min-h-[var(--tap)] rounded-xl px-3 text-[15px] font-medium text-critical hover:bg-surface-2">
                Sign out
              </button>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
