"use client";

import { useRef, useState } from "react";
import { PlusIcon, SettingsIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { ConfirmDelete } from "@/components/ds/confirm-delete";
import { EmptyState } from "@/components/ds/empty-state";
import { Input } from "@/components/ds/input";
import { Row, RowList } from "@/components/ds/row";
import { Skeleton } from "@/components/ds/skeleton";
import { ListsPage } from "@/components/lists/lists-page";
import { FavoritesSection } from "@/components/shopping/favorites-section";
import { ItemSheet } from "@/components/shopping/item-sheet";
import { ListSettingsSheet, NewListSheet } from "@/components/shopping/list-sheet";
import {
  TICK_GRACE_MS,
  useShoppingActions,
  useShoppingFavorites,
  useShoppingItems,
  useShoppingListActions,
  useTickGrace,
} from "@/components/shopping/use-shopping";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";

export function ShoppingListsView() {
  return (
    <ModuleGate module="shopping">
      <ShoppingLists />
    </ModuleGate>
  );
}

function ShoppingLists() {
  const { data: lists } = trpc.shopping.lists.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();

  const [choice, setChoice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const selected = lists?.find((l) => l.id === choice) ?? lists?.[0];
  const { data: items } = useShoppingItems(selected?.id);
  const { data: favorites } = useShoppingFavorites(selected?.id);
  const actions = useShoppingActions(selected?.id);
  const ticks = useTickGrace();
  const showSkeleton = useDelayed(!lists || !me);
  // A list that could not be deleted comes back selected again.
  const listActions = useShoppingListActions({ onDeleteUndone: setChoice });

  const query = name.trim();
  const { data: suggestions } = trpc.shopping.suggest.useQuery(
    { listId: selected?.id ?? "", q: query },
    { enabled: !!selected && query.length > 0 },
  );
  const showSuggestions = focused && query.length > 0 && (suggestions?.length ?? 0) > 0;

  const header = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon /> List
    </Button>
  );

  if (!lists || !me || !selected) {
    return (
      <ListsPage actions={header}>
        {!lists || !me ? (
          showSkeleton && (
            <div role="status" aria-busy="true" className="flex flex-col gap-2">
              <span className="sr-only">Loading…</span>
              <Skeleton className="h-11 w-48" />
              <Skeleton className="h-11 w-full" />
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )
        ) : (
          <EmptyState title="No shopping lists yet." action={<Button onClick={() => setCreating(true)}>New list</Button>} />
        )}
        {creating && (
          <NewListSheet onCreate={(n, shared) => setChoice(listActions.create({ name: n, shared }))} onClose={() => setCreating(false)} />
        )}
      </ListsPage>
    );
  }

  const multiMember = (household?.members.length ?? 0) > 1;
  const isShared = selected.ownerId === null;
  // Ticked items stay (struck through) only for the grace period, then drop off.
  const open = items?.filter((i) => !i.checkedAt || ticks.leaving.has(i.id)) ?? [];
  const favoriteFor = (n: string) => favorites?.find((f) => f.name.toLowerCase() === n.toLowerCase());
  const editingItem = items?.find((i) => i.id === editing);
  const removingItem = items?.find((i) => i.id === removing);

  function add(picked?: string) {
    const finalName = (picked ?? name).trim();
    if (!finalName) return;
    actions.addItem.mutate({ listId: selected!.id, name: finalName });
    setName("");
    nameRef.current?.focus();
  }

  return (
    <ListsPage actions={header}>
      <ChoiceChips
        label="Shopping lists"
        value={selected.id}
        onChange={setChoice}
        options={lists.map((l) => ({
          value: l.id,
          label: `${l.name}${l.openCount > 0 ? ` · ${l.openCount}` : ""}${l.ownerId !== null ? " · Private" : ""}`,
        }))}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
          <p className="text-sm text-muted-foreground">
            {isShared ? "Shared — everyone in your household" : "Private — only you"}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Settings for ${selected.name}`} onClick={() => setSettingsOpen(true)}>
          <SettingsIcon />
        </Button>
      </div>

      <div className="relative">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={120}
            placeholder="Add an item"
            aria-label="New item"
            autoComplete="off"
            enterKeyHint="done"
          />
          <Button type="submit" disabled={!name.trim()}>
            Add
          </Button>
        </form>
        {showSuggestions && (
          <ul className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-xl border bg-popover shadow-lg">
            {suggestions?.map((suggestion) => (
              <li key={suggestion}>
                {/* onMouseDown so the pick lands before the input's blur hides the list */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(suggestion);
                  }}
                  className="block min-h-11 w-full px-3.5 text-left text-base hover:bg-muted md:text-sm"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items && open.length === 0 ? (
        <EmptyState title="Nothing on this list." />
      ) : (
        <RowList>
          {open.map((item) => {
            const checked = !!item.checkedAt;
            const leaving = ticks.leaving.has(item.id);
            const addedByOther = item.addedBy && item.addedBy.id !== me.id;
            return (
              <Row
                key={item.id}
                check={{
                  checked,
                  onChange: () => {
                    if (!checked) ticks.start(item.id);
                    else ticks.cancel(item.id);
                    actions.setChecked.mutate({ id: item.id, checked: !checked });
                  },
                  label: checked ? `Put ${item.name} back on the list` : `Tick off ${item.name}`,
                }}
                title={item.name}
                done={checked}
                meta={isShared && multiMember && addedByOther ? `Added by ${item.addedBy!.name || item.addedBy!.email}` : undefined}
                trailing={item.quantity ?? undefined}
                rowClassName={leaving && checked ? "shopping-leave" : undefined}
                rowStyle={leaving && checked ? { animationDuration: `${TICK_GRACE_MS}ms` } : undefined}
                onClick={() => setEditing(item.id)}
              />
            );
          })}
        </RowList>
      )}

      <FavoritesSection
        listName={selected.name}
        favorites={favorites ?? []}
        items={items ?? []}
        onAdd={(fav) => actions.addItem.mutate({ listId: selected.id, name: fav.name })}
        onRestore={(id) => actions.setChecked.mutate({ id, checked: false })}
        onRemove={(id) => actions.removeFavorite.mutate({ id })}
        onRename={(id, n) => actions.updateFavorite.mutate({ id, name: n })}
        onCreate={(n) => actions.addFavorite.mutate({ listId: selected.id, name: n })}
      />

      {creating && (
        <NewListSheet onCreate={(n, shared) => setChoice(listActions.create({ name: n, shared }))} onClose={() => setCreating(false)} />
      )}

      {settingsOpen && (
        <ListSettingsSheet
          list={selected}
          onRename={(n) => listActions.rename({ id: selected.id, name: n })}
          onDelete={() => {
            setSettingsOpen(false);
            setConfirmDeleteList(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {editingItem && (
        <ItemSheet
          item={editingItem}
          isFavorite={!!favoriteFor(editingItem.name)}
          onUpdate={(values) => actions.updateItem.mutate({ id: editingItem.id, ...values })}
          onToggleFavorite={() => {
            const fav = favoriteFor(editingItem.name);
            if (fav) actions.removeFavorite.mutate({ id: fav.id });
            else actions.addFavorite.mutate({ listId: selected.id, name: editingItem.name });
          }}
          onRemove={() => {
            setEditing(null);
            setRemoving(editingItem.id);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDelete
        open={!!removingItem}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removingItem?.name ?? ""}?`}
        description="It will be taken off the list."
        confirmLabel="Remove"
        onConfirm={() => removingItem && actions.deleteItem.mutate({ id: removingItem.id })}
      />

      <ConfirmDelete
        open={confirmDeleteList}
        onOpenChange={setConfirmDeleteList}
        title={`Delete ${selected.name}?`}
        description="The list and everything on it will be removed."
        confirmLabel="Delete list"
        onConfirm={() => {
          // The next list takes over at once (the one before it, if this was the last).
          const at = lists.findIndex((l) => l.id === selected.id);
          setChoice((lists[at + 1] ?? lists[at - 1])?.id ?? null);
          listActions.remove({ id: selected.id });
        }}
      />
    </ListsPage>
  );
}
