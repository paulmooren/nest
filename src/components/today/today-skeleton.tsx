import { Skeleton } from "@/components/ui/skeleton";

/** Today: Quick add, then the lists. */
export function TodayLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 md:gap-8">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-11 w-full md:h-9" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
