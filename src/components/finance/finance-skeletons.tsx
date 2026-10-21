import { RowsSkeleton, Skeleton } from "@/components/ui/skeleton";

/** The Budgets page: headline figure, account pills, then the income and expenses lists. */
export function BudgetsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-3 h-3.5 w-56" />
      </div>
      <div className="flex gap-2">
        {[28, 24, 32].map((w, i) => (
          <Skeleton key={i} className="h-9 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <Skeleton className="mb-3 h-4 w-24" />
          <RowsSkeleton rows={3} />
        </div>
        <div>
          <Skeleton className="mb-3 h-4 w-24" />
          <RowsSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

/** The Transactions page: filter row, then table rows. */
export function TransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <RowsSkeleton rows={8} />
    </div>
  );
}

/** The Accounts page: intro, then grouped account rows. */
export function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-3.5 w-56" />
      </div>
      <RowsSkeleton rows={5} />
    </div>
  );
}
