import { LoadingScreen, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingScreen>
      <RowsSkeleton rows={6} />
    </LoadingScreen>
  );
}
