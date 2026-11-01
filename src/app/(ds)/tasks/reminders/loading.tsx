import { Skeleton } from "@/components/ds/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-8 w-40" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
