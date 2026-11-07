import { Prefetched } from "@/trpc/prefetched";
import { caller, loadQuery } from "@/trpc/server";

export const metadata = { title: "Recipes" };

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Prefetched
      load={() =>
        Promise.all([
          loadQuery("recipes.list", undefined, () => caller.recipes.list()),
          loadQuery("recipes.listCookbooks", undefined, () => caller.recipes.listCookbooks()),
        ])
      }
    >
      {children}
    </Prefetched>
  );
}
