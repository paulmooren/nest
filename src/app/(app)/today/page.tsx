import { TodayView } from "@/components/today/today-view";
import { isModuleEnabled } from "@/lib/modules";
import { loadShoppingList } from "@/trpc/prefetch-shopping";
import { HydrateClient, caller, loadHousehold, loadQuery } from "@/trpc/server";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const household = await loadHousehold();
  const on = (key: Parameters<typeof isModuleEnabled>[1]) => isModuleEnabled(household?.disabledModules ?? [], key);

  // Everything Today shows for the Modules that are on, side by side, so it arrives with the page.
  await Promise.all([
    on("finance") && [
      loadQuery("account.list", undefined, () => caller.account.list()),
    ],
    on("shopping") && loadShoppingList("dashboard"),
    on("tasks") && [
      loadQuery("task.list", undefined, () => caller.task.list()),
      loadQuery("reminder.list", undefined, () => caller.reminder.list()),
    ],
  ].flat());

  return (
    <HydrateClient>
      <TodayView />
    </HydrateClient>
  );
}
