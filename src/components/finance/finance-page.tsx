"use client";

import { PageBody, PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/ui/section-tabs";

const TABS = [
  { href: "/finance/budgets", label: "Budgets" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/accounts", label: "Accounts" },
];

/** What every Finance page shares: the title, the page's own actions, then the tabs and the page body. */
export function FinancePage({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Finance" actions={actions} inHeader />
      <PageBody>
        <SectionTabs tabs={TABS} label="Finance sections" />
        {children}
      </PageBody>
    </>
  );
}
