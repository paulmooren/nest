"use client";

import { FinancePage } from "@/components/finance/finance-page";
import { PAGE_ACTIONS_ID } from "@/components/page-actions";

/**
 * Stop-gap for Finance pages not rebuilt yet: gives them the new header and tabs, and a slot for the old
 * `PageActions` portal. Deleted when the last old Finance page is rebuilt.
 */
export function LegacyFinance({ children }: { children: React.ReactNode }) {
  return (
    <FinancePage actions={<div id={PAGE_ACTIONS_ID} className="flex flex-wrap items-center gap-2 empty:hidden" />}>
      {children}
    </FinancePage>
  );
}
