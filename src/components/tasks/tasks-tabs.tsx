"use client";

import { TabBar } from "@/components/tab-bar";

export function TasksTabs({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <TabBar
        label="Task sections"
        tabs={[
          { href: "/tasks/todos", label: "Todos" },
          { href: "/tasks/reminders", label: "Reminders" },
        ]}
      />
      {children}
    </div>
  );
}
