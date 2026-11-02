"use client";

import { PageBody, PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/ui/section-tabs";
import { useModules } from "@/components/use-modules";
import type { ModuleKey } from "@/lib/modules";

const TABS: { href: string; label: string; module: ModuleKey }[] = [
  { href: "/lists/shopping", label: "Shopping", module: "shopping" },
  { href: "/lists/wishlist", label: "Wishlist", module: "wishlist" },
];

/** What every Lists page shares: the title, the page's own actions, then tabs (when both Modules are on) and the body. */
export function ListsPage({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) {
  const { isEnabled } = useModules();
  const tabs = TABS.filter((t) => isEnabled(t.module));

  return (
    <>
      <PageHeader title="Lists" actions={actions} />
      <PageBody>
        {tabs.length > 1 && <SectionTabs tabs={tabs} label="List sections" />}
        {children}
      </PageBody>
    </>
  );
}
