"use client";

import Link from "next/link";

import { trpc } from "@/trpc/react";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { TICK_GRACE_MS, useShoppingActions, useShoppingItems, useTickGrace } from "@/components/shopping/use-shopping";

const MAX_ROWS = 6;

/** Open items of the household's main (first Shared) list. Items are added with Quick add at the top of Today. */
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
    <Section title={main.name}>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on this list.</p>
      ) : (
        <RowList>
          {shown.map((item) => {
            const checked = !!item.checkedAt;
            const leaving = ticks.leaving.has(item.id);
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
                trailing={item.quantity ?? undefined}
                rowClassName={leaving && checked ? "shopping-leave" : undefined}
                rowStyle={leaving && checked ? { animationDuration: `${TICK_GRACE_MS}ms` } : undefined}
              />
            );
          })}
        </RowList>
      )}
      <Link href="/lists/shopping" className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        {open.length > shown.length ? `+ ${open.length - shown.length} more · ` : ""}Open list
      </Link>
    </Section>
  );
}
