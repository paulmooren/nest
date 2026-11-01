"use client";

import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/** The way back from an entry or the new-entry screen to the Vault list. */
export function VaultBackLink() {
  return (
    <Link
      href="/vault"
      className="-mt-2 mb-2 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" aria-hidden />
      Vault
    </Link>
  );
}

/** The expiry as a pill: red when it is close or past, quiet otherwise. */
export function ExpiryBadge({ text, critical }: { text: string; critical: boolean }) {
  return (
    <Badge variant={critical ? "destructive" : "secondary"} className="h-auto whitespace-nowrap px-2.5 py-1 text-xs font-medium">
      {text}
    </Badge>
  );
}

export function VaultBones({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="h-11 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
