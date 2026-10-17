"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";

import { Avatar } from "@/components/avatar";
import { IS_DEMO_CLIENT } from "@/lib/demo";
import { signOutAction } from "@/app/(app)/settings/actions";

export type DrawerItem = { href: string; label: string; Icon: (props: { active?: boolean }) => React.ReactElement };

const SETTINGS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/household", label: "Household" },
  { href: "/settings/categories", label: "Categories" },
  // No push notifications in the Demo.
  ...(IS_DEMO_CLIENT ? [] : [{ href: "/settings/notifications", label: "Notifications" }]),
  { href: "/settings/data", label: "Data" },
];

const ROW = "flex min-h-[var(--tap-primary)] items-center gap-3 rounded-xl px-3 text-[16px]";

/**
 * The phone's navigation: a burger button that opens a drawer from the left with every destination, the
 * settings pages and sign-out. (A bottom tab bar fights the mobile browser's own bottom controls.)
 * Built on the Base UI Dialog, so focus is trapped inside, Escape closes it and focus returns to the button.
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

  // Following a link closes the drawer (the page changes under it).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open menu"
        className="-ml-2 flex h-[var(--tap)] w-[var(--tap)] shrink-0 items-center justify-center rounded-xl text-text hover:bg-surface-2 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="fixed inset-y-0 left-0 flex h-dvh w-[86%] max-w-[330px] flex-col bg-bg shadow-2xl outline-none">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent-fill">
                <span className="font-display text-[16px] font-bold text-accent-ink">N</span>
              </div>
              <Dialog.Title className="font-display text-[17px] font-bold tracking-tight">Nest</Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close menu"
              className="flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-full text-text-muted hover:bg-surface-2"
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
                    className={`${ROW} ${active ? "bg-surface font-semibold text-text" : "font-medium text-text-muted"}`}
                  >
                    <span className="block h-5 w-5 shrink-0">
                      <Icon active={active} />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>

            <h2 className="mt-6 mb-1 px-3 text-[12px] font-semibold tracking-wider text-text-muted uppercase">Settings</h2>
            <div className="flex flex-col gap-0.5">
              {SETTINGS.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`${ROW} ${active ? "bg-surface font-semibold text-text" : "font-medium text-text-muted"}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="flex items-center gap-3 border-t border-border-soft px-4 pt-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
            <Avatar name={userName} image={image} size={32} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{userName}</span>
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
