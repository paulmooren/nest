import { Skeleton } from "@/components/ui/skeleton";

/** Today: Quick add, then the two lists. */
export function TodayLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 md:gap-8">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-11 w-full md:h-9" />
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        {[3, 5].map((rows) => (
          <div key={rows} className="flex flex-col gap-2">
            <Skeleton className="mb-1 h-4 w-24" />
            {Array.from({ length: rows }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
