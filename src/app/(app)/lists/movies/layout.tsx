import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

export const metadata = { title: "Movies & Series" };

export default function MoviesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={() =>
        Promise.all([
          loadQuery("movies.list", undefined, () => caller.movies.list()),
          loadQuery("movies.listWatchlists", undefined, () => caller.movies.listWatchlists()),
        ])
      }
    >
      {children}
    </Prefetched>
  );
}
