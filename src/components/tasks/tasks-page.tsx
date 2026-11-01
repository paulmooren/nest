"use client";

import { PageBody, PageHeader } from "@/components/ds/page-header";
import { SectionTabs } from "@/components/ds/section-tabs";

const TABS = [
  { href: "/tasks/todos", label: "Todos" },
  { href: "/tasks/reminders", label: "Reminders" },
];

/** What every Tasks page shares: the title, the page's own actions, then the tabs and the page body. */
export function TasksPage({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Tasks" actions={actions} />
      <PageBody>
        <SectionTabs tabs={TABS} label="Task sections" />
        {children}
      </PageBody>
    </>
  );
}
