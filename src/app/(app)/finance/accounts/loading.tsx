import { LoadingScreen } from "@/components/ui/skeleton";
import { AccountsSkeleton } from "@/components/finance/finance-skeletons";

export default function Loading() {
  return (
    <LoadingScreen>
      <AccountsSkeleton />
    </LoadingScreen>
  );
}
