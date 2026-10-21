import { LoadingScreen } from "@/components/ui/skeleton";
import { TransactionsSkeleton } from "@/components/finance/finance-skeletons";

export default function Loading() {
  return (
    <LoadingScreen>
      <TransactionsSkeleton />
    </LoadingScreen>
  );
}
