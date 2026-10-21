import { LoadingScreen, RowsSkeleton, Skeleton } from "@/components/ui/skeleton";

/** The dashboard: the summary line, then the two lists. */
export function DashboardSkeleton() {
  return (
    <LoadingScreen className="flex flex-col gap-6 md:gap-8">
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {[3, 5].map((rows) => (
          <div key={rows}>
            <Skeleton className="mb-3 h-4 w-24" />
            <RowsSkeleton rows={rows} />
          </div>
        ))}
      </div>
    </LoadingScreen>
  );
}
