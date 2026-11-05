import { IS_DEMO_CLIENT } from "@/lib/demo";

/** Marks the Demo, so nobody mistakes it for the real app (or its numbers for real ones). Renders nothing elsewhere. */
export function DemoBadge({ className = "" }: { className?: string }) {
  if (!IS_DEMO_CLIENT) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
      {/* The phone's top bar also holds the bell and the profile, so it only has room for the short form. */}
      <span className="max-sm:hidden">Demo — made-up data</span>
      <span className="sm:hidden">Demo</span>
    </span>
  );
}
