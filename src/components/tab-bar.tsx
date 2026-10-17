"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

/**
 * Page tabs: links between pages, the current one marked for assistive technology.
 * On a phone a segmented control with 44px segments (equal widths when 3 or fewer fit, otherwise scrolling,
 * with the current one scrolled into view); from `md` up, underlined tabs.
 */
export function TabBar({ tabs, label = "Sections" }: { tabs: Tab[]; label?: string }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const equal = tabs.length <= 3;

  // A scrolling bar can leave the current tab off-screen after a navigation.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1 md:gap-1 md:rounded-none md:border-b md:border-border-soft md:bg-transparent md:p-0"
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            ref={active ? activeRef : undefined}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[var(--tap)] shrink-0 items-center justify-center gap-2 rounded-[9px] px-3.5 text-[14px] font-medium whitespace-nowrap transition-colors md:min-h-0 md:rounded-none md:border-b-2 md:pt-0 md:pb-3 md:text-[13.5px] ${
              equal ? "flex-1 md:flex-none" : ""
            } ${
              active
                ? "bg-surface text-text shadow-sm md:border-text md:bg-transparent md:shadow-none"
                : "text-text-muted hover:text-text md:border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
