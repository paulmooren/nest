import { Skeleton } from "@/components/ui/skeleton";

/** Today: the Inbox, then the two lists. */
export function TodayLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 md:gap-8">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="mb-1 h-4 w-24" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
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
