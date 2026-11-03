"use client";

import { PageBody, PageHeader } from "@/components/ui/page-header";

/** What the Finance page shares: the title, the page's own actions, then the page body. */
export function FinancePage({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Finance" actions={actions} inHeader />
      <PageBody>{children}</PageBody>
    </>
  );
}
