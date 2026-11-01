import { Skeleton } from "@/components/ds/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-11 w-28" />
    </div>
  );
}
