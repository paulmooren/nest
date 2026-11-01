import { redirect } from "next/navigation";

import { NavShell } from "@/components/ui/nav-shell";
import { PhoneHint } from "@/components/use-media-query";
import { guessPhone } from "@/lib/device";
import { TRPCProvider } from "@/trpc/react";
import { HydrateClient, caller, getServerContext, loadHousehold, loadQuery } from "@/trpc/server";

/** The signed-in frame: the session and household gate, the data layer, and the app shell. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
