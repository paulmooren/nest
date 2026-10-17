"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

/**
 * Underlined page tabs: links between pages, the current one marked for assistive technology. The same on every
 * screen size; on a phone the tabs are 44px tall and the bar scrolls sideways if they don't fit, with the current
 * one scrolled into view.
 */
export function TabBar({ tabs, label = "Sections" }: { tabs: Tab[]; label?: string }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // A scrolling bar can leave the current tab off-screen after a navigation.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav aria-label={label} className="flex items-center gap-1 overflow-x-auto border-b border-border-soft">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            ref={active ? activeRef : undefined}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[var(--tap)] shrink-0 items-center gap-2 border-b-2 px-3.5 text-[14px] font-medium transition-colors md:min-h-0 md:pt-0 md:pb-3 md:text-[13.5px] ${
              active ? "border-text text-text" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
