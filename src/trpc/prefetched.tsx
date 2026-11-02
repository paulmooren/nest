import { HydrateClient } from "@/trpc/server";

/**
 * Wraps a client page so it arrives with its data, the way the dashboard does: `load` starts every query the page
 * asks for (through `loadQuery`, so each lands where the page's `useQuery` looks), and the answers are handed over
 * once they're in. A query that fails is left for the browser to try again, so a slow or failing prefetch never
 * breaks the page. Use it from a `layout.tsx` next to a client `page.tsx`.
 */
export async function Prefetched({ load, children }: { load: () => Promise<unknown>; children: React.ReactNode }) {
  await load();
  return <HydrateClient>{children}</HydrateClient>;
}
