"use client";

import { useState } from "react";

import { useDelayed } from "@/components/use-delayed";
import { trpc } from "@/trpc/react";
import { useCategoryActions } from "@/components/finance/use-categories";
import { ColorBarPicker } from "@/components/finance/color-picker";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { PageBody } from "@/components/ds/page-header";
import { RowList } from "@/components/ds/row";
import { Skeleton } from "@/components/ds/skeleton";

export default function CategoriesSettingsPage() {
  const { data: categories } = trpc.category.list.useQuery();
  const categoryActions = useCategoryActions();
  const showSkeleton = useDelayed(categories === undefined);
  const [newCategory, setNewCategory] = useState("");
  const [newColor, setNewColor] = useState("#7fb8e8");

  if (categories === undefined) {
    return showSkeleton ? (
      <div role="status" aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Loading…</span>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    ) : null;
  }

  return (
    <PageBody>
      <form
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newCategory.trim()) return;
          categoryActions.create({ name: newCategory.trim(), color: newColor });
          setNewCategory("");
        }}
      >
        <ColorBarPicker value={newColor} label="Pick a colour for the new category" onChange={setNewColor} />
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          aria-label="New category"
          placeholder="New category"
        />
        <Button type="submit" variant="outline">
          Add
        </Button>
      </form>

      <RowList>
        {categories.map((c) => (
          <li key={c.id} className="flex min-h-14 items-center gap-3 px-4 py-1 md:px-5">
            <ColorBarPicker
              value={c.color}
              label={`Change colour of ${c.name}`}
              onChange={(color) => categoryActions.update({ id: c.id, color })}
            />
            <Input
              // Remounted when the name changes, so an edit that was undone shows the old name again.
              key={c.name}
              defaultValue={c.name}
              aria-label={`Name of ${c.name}`}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== c.name) {
                  categoryActions.update({ id: c.id, name: e.target.value });
                }
              }}
              className="min-w-0 flex-1 border-transparent bg-transparent shadow-none hover:bg-muted focus-visible:bg-background"
            />
            <Button variant="ghost" onClick={() => categoryActions.remove({ id: c.id })} aria-label={`Delete ${c.name}`}>
              Delete
            </Button>
          </li>
        ))}
      </RowList>
    </PageBody>
  );
}
