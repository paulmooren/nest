"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/trpc/react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { OnboardingWizard } from "@/components/today/onboarding-wizard";
import { QuickAdd } from "@/components/today/quick-add";
import { RemindersCard } from "@/components/today/reminders-card";
import { ShoppingCard } from "@/components/today/shopping-card";
import { TodayLoading } from "@/components/today/today-skeleton";
import { TodosCard } from "@/components/today/todos-card";
import { useModules } from "@/components/use-modules";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayView() {
  const { data: accounts, isLoading } = trpc.account.list.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { ready, isEnabled } = useModules();
  const finance = isEnabled("finance");
  const tasks = isEnabled("tasks");
  const shopping = isEnabled("shopping");

  // Decided once, from the account count at first load — a mid-wizard mutation (e.g. creating the first account in
  // step 1) must not yank the wizard away just because the live count changed.
  const [showWizard, setShowWizard] = useState<boolean | null>(null);
  if (showWizard === null && accounts && ready) {
    // The wizard only sets up Finance, so it is skipped when Finance is off.
    setShowWizard(finance && accounts.length === 0);
  }

  // The time of day is the browser's, so the server's guess is allowed to differ.
  const name = me?.name || me?.email?.split("@")[0] || "there";
  const title = (
    <span suppressHydrationWarning>
      {greeting()}, {name}
    </span>
  );

  if (isLoading || showWizard === null) {
    return (
      <>
        <PageHeader title={title} />
        <TodayLoading />
      </>
    );
  }

  if (showWizard) {
    return (
      <>
        <PageHeader title="Welcome to Nest" />
        <OnboardingWizard onComplete={() => setShowWizard(false)} />
      </>
    );
  }

  if (!tasks && !shopping) {
    return (
      <>
        <PageHeader title={title} />
        <EmptyState
          title={
            <>
              Nothing to show here.{" "}
              <Link href="/settings/household" className="font-medium text-foreground underline underline-offset-4">
                Choose what your household uses in Settings
              </Link>
              .
            </>
          }
        />
      </>
    );
  }

  // Quick add opens the page. Then the working lists: Todos and Reminders on one side, Groceries on the other, with
  // the tasks first on a phone.
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <QuickAdd />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {shopping && <ShoppingCard />}
          {tasks && (
            <div className="flex flex-col gap-8 max-lg:order-first">
              <TodosCard />
              <RemindersCard />
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
