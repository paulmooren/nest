import { LoadingScreen } from "@/components/ui/skeleton";
import { BudgetsSkeleton } from "@/components/finance/finance-skeletons";

export default function Loading() {
  return (
    <LoadingScreen>
      <BudgetsSkeleton />
    </LoadingScreen>
  );
}
