import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

export const metadata = { title: "Vault" };

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={() =>
        Promise.all([
          loadQuery("vault.list", undefined, () => caller.vault.list()),
          loadQuery("vault.listCategories", undefined, () => caller.vault.listCategories()),
        ])
      }
    >
      {children}
    </Prefetched>
  );
}
