import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={() =>
        Promise.all([
          loadQuery("task.list", undefined, () => caller.task.list()),
        ])
      }
    >
      {children}
    </Prefetched>
  );
}
