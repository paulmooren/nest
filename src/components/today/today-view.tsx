"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/trpc/react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Inbox } from "@/components/notifications/inbox";
import { OnboardingWizard } from "@/components/today/onboarding-wizard";
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

  if (!finance && !tasks && !shopping && !isEnabled("vault")) {
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

  // The Inbox opens the page; the two working lists sit side by side on a wide screen, Todos first on a phone.
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <Inbox />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {shopping && <ShoppingCard />}
          {tasks && (
            <div className="max-lg:order-first">
              <TodosCard />
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
