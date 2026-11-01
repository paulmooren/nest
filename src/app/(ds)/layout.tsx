import { redirect } from "next/navigation";

import { NavShell } from "@/components/ds/nav-shell";
import { PhoneHint } from "@/components/use-media-query";
import { guessPhone } from "@/lib/device";
import { TRPCProvider } from "@/trpc/react";
import { HydrateClient, caller, getServerContext, loadHousehold, loadQuery } from "@/trpc/server";

/**
 * The signed-in frame of the rebuilt screens (docs/rebuild/MASTER_BRIEF.md). Same gate and data layer as `(app)`;
 * only the shell differs. Sections move here from `(app)` one at a time.
 */
export default async function DsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getServerContext();
  if (!ctx.session?.user) redirect("/signin");

  const [householdId] = await Promise.all([
    ctx.getHouseholdId(),
    loadQuery("user.me", undefined, () => caller.user.me()),
    loadHousehold(),
  ]);
  if (!householdId) redirect("/household-setup");

  const userName = ctx.session.user.name ?? ctx.session.user.email?.split("@")[0] ?? "there";

  return (
    <TRPCProvider>
      <HydrateClient>
        <PhoneHint phone={await guessPhone()}>
          <NavShell userName={userName}>{children}</NavShell>
        </PhoneHint>
      </HydrateClient>
    </TRPCProvider>
  );
}
