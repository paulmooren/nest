"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import Link from "next/link";
import { useModules } from "@/components/use-modules";
import { MissingStatementsCard } from "@/components/dashboard/missing-statements-card";
import { ShoppingCard } from "@/components/dashboard/shopping-card";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { TasksSnapshot } from "@/components/dashboard/tasks-snapshot";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

export function DashboardView() {
  const { data: accounts, isLoading } = trpc.account.list.useQuery();
  const { ready, isEnabled } = useModules();
  const finance = isEnabled("finance");
  const tasks = isEnabled("tasks");
  const shopping = isEnabled("shopping");
  const vault = isEnabled("vault");

  // Decided once, from the account count at first load — a mid-wizard mutation
  // (e.g. creating the first account in step 1) must not yank the wizard away
  // just because the live count changed.
  const [showWizard, setShowWizard] = useState<boolean | null>(null);
  if (showWizard === null && accounts && ready) {
    // The wizard only sets up Finance, so it is skipped when Finance is off.
    setShowWizard(finance && accounts.length === 0);
  }

  if (isLoading || showWizard === null) {
    return <DashboardSkeleton />;
  }

  if (showWizard) {
    return <OnboardingWizard onComplete={() => setShowWizard(false)} />;
  }

  if (!finance && !tasks && !shopping && !vault) {
    return (
      <p className="py-10 text-center text-[13.5px] text-text-muted">
        Nothing to show here.{" "}
        <Link href="/settings/household" className="text-accent hover:opacity-80">
          Choose what your household uses in Settings
        </Link>
        .
      </p>
    );
  }

  // The two working lists sit side by side on a wide screen; on a phone Tasks comes first.
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <DashboardSummary tasks={tasks} shopping={shopping} vault={vault} />
      {finance && <MissingStatementsCard />}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {shopping && <ShoppingCard />}
        {(tasks || vault) && (
          <div className="max-lg:order-first">
            <TasksSnapshot showTasks={tasks} showVault={vault} />
          </div>
        )}
      </div>
    </div>
  );
}
