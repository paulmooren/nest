"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";

import { Avatar } from "@/components/avatar";
import { signOutAction } from "@/app/(app)/settings/actions";

export type DrawerItem = { href: string; label: string; Icon: (props: { active?: boolean }) => React.ReactElement };

const ROW = "flex min-h-12 items-center gap-4 px-4 text-[16px]";
// The burger and the close button are one button in one place, so the menu seems to open from it and close back into it.
const MENU_BUTTON =
  "-mr-2 flex h-[var(--tap)] w-[var(--tap)] shrink-0 items-center justify-center rounded-xl text-text hover:bg-surface-2";

function MenuIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

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
        className={`${MENU_BUTTON} md:hidden`}
      >
        <MenuIcon path="M4 7h16M4 12h16M4 17h16" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 flex h-dvh w-full flex-col bg-bg outline-none transition duration-150 data-ending-style:translate-y-1 data-ending-style:opacity-0 data-starting-style:translate-y-1 data-starting-style:opacity-0">
          <Dialog.Title className="sr-only">Nest</Dialog.Title>
          <div className="flex items-start justify-between px-4 pt-2">
            <span className={`mt-1 rounded-full ${settingsActive ? "ring-2 ring-text ring-offset-2 ring-offset-bg" : ""}`}>
              <Avatar name={userName} image={image} size={56} />
            </span>
            <Dialog.Close aria-label="Close menu" className={MENU_BUTTON}>
              <MenuIcon path="M6 6l12 12M18 6L6 18" />
            </Dialog.Close>
          </div>
          <Link
            href="/settings"
            aria-current={settingsActive ? "page" : undefined}
            className="flex min-h-14 items-center justify-between gap-3 border-b border-border-soft px-4"
          >
            <span className="min-w-0 truncate text-[18px] font-bold">{userName}</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain py-2">
            {items.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`${ROW} ${active ? "font-semibold text-text" : "font-medium text-text-muted"}`}
                >
                  <span className="block h-[22px] w-[22px] shrink-0">
                    <Icon active={active} />
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>

          <form action={signOutAction} className="border-t border-border-soft py-2 [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))]">
            <button type="submit" className={`${ROW} w-full text-left font-medium text-text-muted`}>
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />
              </svg>
              Sign out
            </button>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
