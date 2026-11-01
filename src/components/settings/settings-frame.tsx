"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { PageBody, PageHeader } from "@/components/ds/page-header";
import { Row, RowList } from "@/components/ds/row";
import { SectionTabs } from "@/components/ds/section-tabs";
import type { SettingsSection } from "@/components/settings/sections";

/**
 * Settings are one section with five pages. Desktop: tabs under the title. Phone: the index is a list of
 * sections, and each page has a way back to it (drill-down), so no scrolling tab bar.
 */
export function SettingsFrame({ sections, children }: { sections: SettingsSection[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = sections.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));

  // The index renders its own title.
  if (!current) return <>{children}</>;

  return (
    <>
      <Link
        href="/settings"
        className="-mt-2 mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"
      >
        <ChevronLeftIcon className="size-4" aria-hidden />
        Settings
      </Link>
      <PageHeader title={current.label} />
      <PageBody>
        <div className="hidden md:block">
          <SectionTabs label="Settings sections" tabs={sections.map(({ href, label }) => ({ href, label }))} />
        </div>
        <div className="max-w-[560px]">{children}</div>
      </PageBody>
    </>
  );
}

/**
 * The phone's Settings index, rendered by `/settings`. From 768px up Settings has tabs instead, so a wide screen is
 * sent on to the first page; the list is hidden there, so nothing flashes. Decided in the browser, not from the user
 * agent, so a tablet or a resized window gets the right one.
 */
export function SettingsIndex({ sections }: { sections: SettingsSection[] }) {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) router.replace(sections[0].href);
  }, [router, sections]);

  return (
    <div className="md:hidden">
      <PageHeader title="Settings" />
      <RowList>
        {sections.map((s) => (
          <Row key={s.href} href={s.href} title={s.label} meta={s.description} chevron />
        ))}
      </RowList>
    </div>
  );
}
