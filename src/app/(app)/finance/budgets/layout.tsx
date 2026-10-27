import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={() =>
        Promise.all([
          loadQuery("account.list", undefined, () => caller.account.list()),
          loadQuery("category.list", undefined, () => caller.category.list()),
          loadQuery("recurring.list", undefined, () => caller.recurring.list()),
          loadQuery("recurring.suggestions", undefined, () => caller.recurring.suggestions()),
          loadQuery("budgetGroup.list", undefined, () => caller.budgetGroup.list()),
        ])
      }
    >
      {children}
    </Prefetched>
  );
}
