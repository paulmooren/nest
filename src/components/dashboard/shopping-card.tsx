"use client";

import Link from "next/link";

import { trpc } from "@/trpc/react";
import { AddItemRow } from "@/components/shopping/add-item-row";
import { ShoppingItemRow } from "@/components/shopping/item-row";
import {
  useShoppingActions,
  useShoppingItems,
  useTickGrace,
} from "@/components/shopping/use-shopping";

const MAX_ROWS = 6;

/** Open items of the household's main (first Shared) list, with a quick-add box. */
export function ShoppingCard() {
  const { data: lists } = trpc.shopping.lists.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const main = lists?.find((l) => l.ownerId === null) ?? lists?.[0];
  const { data: items } = useShoppingItems(main?.id);
  const actions = useShoppingActions(main?.id);
  const ticks = useTickGrace();

  if (!main || !me) return null;

  const open = items?.filter((i) => !i.checkedAt || ticks.leaving.has(i.id)) ?? [];
  const shown = open.slice(0, MAX_ROWS);

  return (
    <section className="overflow-hidden rounded-[20px] border border-border-soft bg-surface">
      <div className="mb-3 flex items-center justify-between px-6 pt-4 md:items-baseline md:pt-6">
        <h2 className="text-[15px] font-semibold">{main.name}</h2>
        <Link href="/lists/shopping" className="flex min-h-[var(--tap)] items-center px-2 -mr-2 text-[14px] font-medium text-accent hover:opacity-80 md:min-h-0 md:text-[12.5px]">
          Open list
        </Link>
      </div>
      <div className="border-t border-border-soft">
        {shown.map((item) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            currentUserId={me.id}
            showAddedBy={false}
            leaving={ticks.leaving.has(item.id)}
            onToggle={(checked) => {
              if (checked) ticks.start(item.id);
              else ticks.cancel(item.id);
              actions.setChecked.mutate({ id: item.id, checked });
            }}
            onUpdate={(values) => actions.updateItem.mutate({ id: item.id, ...values })}
            onDelete={() => actions.deleteItem.mutate({ id: item.id })}
          />
        ))}
        {open.length > shown.length && (
          <Link
            href="/lists/shopping"
            className="block border-b border-border-soft px-6 py-3 text-[12.5px] font-medium text-text-muted hover:text-text"
          >
            + {open.length - shown.length} more
          </Link>
        )}
        <AddItemRow
          listId={main.id}
          onAdd={({ name }) => actions.addItem.mutate({ listId: main.id, name })}
        />
      </div>
    </section>
  );
}
