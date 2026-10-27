import { headers } from "next/headers";

import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

// The page lists 50 rows on a phone and 200 elsewhere (PHONE_PAGE_SIZE / PAGE_SIZE in page.tsx). The server can only
// guess the screen from the user agent; a wrong guess just means the browser fetches its own page size.
const PHONE_PAGE_SIZE = 50;
const PAGE_SIZE = 200;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={async () => {
        const limit = /Mobi|Android|iPhone/i.test((await headers()).get("user-agent") ?? "") ? PHONE_PAGE_SIZE : PAGE_SIZE;
        await Promise.all([
          loadQuery("account.list", undefined, () => caller.account.list()),
          loadQuery("category.list", undefined, () => caller.category.list()),
          loadQuery("recurring.list", undefined, () => caller.recurring.list()),
          loadQuery("transaction.list", { limit }, () => caller.transaction.list({ limit })),
        ]);
      }}
    >
      {children}
    </Prefetched>
  );
}
