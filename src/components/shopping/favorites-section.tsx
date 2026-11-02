"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon, SettingsIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Section } from "@/components/ui/section";
import type { ShoppingItemData } from "@/components/shopping/types";

export type FavoriteData = { id: string; name: string };

/**
 * What you buy often, one tap to add. A favorite already on the list shows ticked and does nothing; one in the
 * basket is put back. "Manage" opens the full list to add, rename or remove favorites.
 */
export function FavoritesSection({
  listName,
  favorites,
  items,
  onAdd,
  onRestore,
  onRemove,
  onRename,
  onCreate,
}: {
  listName: string;
  favorites: FavoriteData[];
  items: ShoppingItemData[];
  onAdd: (favorite: FavoriteData) => void;
  onRestore: (itemId: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCreate: (name: string) => void;
}) {
  const [managing, setManaging] = useState(false);
  const sorted = [...favorites].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return (
    <Section
      title="Favorites"
      description={`What you buy often, for ${listName}`}
    >
      <div className="flex flex-wrap gap-2">
        {sorted.map((fav) => {
          const existing = items.find((i) => i.name.toLowerCase() === fav.name.toLowerCase());
          const onList = !!existing && !existing.checkedAt;
          return (
            <Button
              key={fav.id}
              type="button"
              variant={onList ? "secondary" : "outline"}
              disabled={onList}
              onClick={() => (existing ? onRestore(existing.id) : onAdd(fav))}
              aria-label={onList ? `${fav.name} is already on the list` : `Add ${fav.name} to the list`}
              className="rounded-full"
            >
              {onList ? <CheckIcon /> : <PlusIcon />}
              {fav.name}
            </Button>
          );
        })}
        <Button type="button" variant="ghost" onClick={() => setManaging(true)} className="rounded-full">
          <SettingsIcon /> Manage
        </Button>
      </div>
      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here yet. Add the things you buy often, or make an item a favorite.</p>
      )}

      {managing && (
        <ResponsiveSheet open onOpenChange={(open) => !open && setManaging(false)} title="Favorites" description={`For ${listName}`}>
          <div className="flex flex-col gap-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("name") as HTMLInputElement;
                if (!input.value.trim()) return;
                onCreate(input.value.trim());
                input.value = "";
              }}
            >
              <Input name="name" maxLength={120} placeholder="New favorite" aria-label="New favorite" autoComplete="off" />
              <Button type="submit">Add</Button>
            </form>
            <ul className="flex flex-col">
              {sorted.map((fav) => (
                <li key={fav.id} className="flex items-center gap-2">
                  <Input
                    key={fav.name}
                    defaultValue={fav.name}
                    aria-label={`Name of favorite ${fav.name}`}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== fav.name && onRename(fav.id, e.target.value.trim())}
                    className="border-transparent bg-transparent shadow-none hover:bg-muted focus-visible:bg-background"
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${fav.name} from favorites`} onClick={() => onRemove(fav.id)}>
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </ResponsiveSheet>
      )}
    </Section>
  );
}
