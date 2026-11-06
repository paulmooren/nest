import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

export const metadata = { title: "Notes" };

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={() =>
        Promise.all([
          loadQuery("notes.list", undefined, () => caller.notes.list()),
          loadQuery("notes.listNotebooks", undefined, () => caller.notes.listNotebooks()),
        ])
      }
    >
      {children}
    </Prefetched>
  );
}
