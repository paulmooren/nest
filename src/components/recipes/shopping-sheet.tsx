"use client";

import { useState } from "react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/components/toast";
import { SECTION_HEADING } from "@/components/recipes/recipes-ui";

/**
 * Pick which Ingredients go on which Shopping list. Everything is ticked to begin with: untick what is already in
 * the cupboard. Lines already on the list are skipped by the server.
 */
export function AddToShoppingSheet({ groups, onClose }: { groups: { title?: string; lines: string[] }[]; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: lists } = trpc.shopping.lists.useQuery();
  const add = trpc.recipes.addToShopping.useMutation();
  const [chosen, setChosen] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const listId = chosen ?? lists?.find((l) => l.ownerId === null)?.id ?? lists?.[0]?.id ?? "";
  const items = (lists ?? []).map((l) => ({ value: l.id, label: l.name }));
  const all = groups.flatMap((g, gi) => g.lines.map((line, li) => ({ key: `${gi}:${li}`, line })));
  const picked = all.filter((i) => !skipped.has(i.key));
  const toggle = (key: string) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="Add to shopping list" description="Untick what you already have.">
      <form
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!listId || picked.length === 0) return;
          try {
            const result = await add.mutateAsync({ listId, lines: picked.map((i) => i.line) });
            await utils.shopping.invalidate();
            const already = result.skipped > 0 ? ` (${result.skipped} already there)` : "";
            showToast(`Added ${result.added} to ${result.listName}${already}`);
            onClose();
          } catch {
            showToast("Couldn't add to the shopping list");
          }
        }}
      >
        {items.length > 1 && (
          <Field id="shopping-list-choice" label="Shopping list">
            <Select items={items} value={listId} onValueChange={(v) => v && setChosen(v)}>
              <SelectTrigger id="shopping-list-choice" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="flex max-h-[45vh] flex-col gap-4 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1">
              {group.title && <h3 className={SECTION_HEADING}>{group.title}</h3>}
              {group.lines.map((line, li) => {
                const key = `${gi}:${li}`;
                return (
                  <label key={key} className="flex min-h-11 items-center gap-3 text-base md:text-sm">
                    <Checkbox checked={!skipped.has(key)} onCheckedChange={() => toggle(key)} aria-label={line} className="rounded-md" />
                    <span className="min-w-0 break-words">{line}</span>
                  </label>
                );
              })}
            </div>
          ))}
          {all.length === 0 && <p className="text-sm text-muted-foreground">No ingredients to add.</p>}
        </div>

        <Button type="submit" size="lg" disabled={!listId || picked.length === 0 || add.isPending}>
          {add.isPending ? "Adding…" : `Add ${picked.length} ${picked.length === 1 ? "item" : "items"}`}
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
