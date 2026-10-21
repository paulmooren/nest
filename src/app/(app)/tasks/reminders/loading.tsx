import { LoadingScreen, PillsSkeleton, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingScreen>
      <PillsSkeleton />
      <RowsSkeleton rows={6} />
    </LoadingScreen>
  );
}
