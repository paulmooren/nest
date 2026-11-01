"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { hasPendingChanges } from "@/trpc/optimistic";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { AmountText } from "@/components/ui/amount-text";
import { Row, RowList } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ListsPage } from "@/components/lists/lists-page";
import { WishSheet } from "@/components/wishlist/wish-sheet";
import type { WishData } from "@/components/wishlist/types";
import { useWishlistActions } from "@/components/wishlist/use-wishlist";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";

const HOME = "home";

export function WishlistsView() {
  return (
    <ModuleGate module="wishlist">
      <Wishlists />
    </ModuleGate>
  );
}

function Wishlists() {
  const { data: household } = trpc.household.current.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const [choice, setChoice] = useState<string | null>(null);
  const [showReceived, setShowReceived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WishData | null>(null);

  const selected = choice ?? me?.id ?? HOME;
  const isHome = selected === HOME;
  const ownerId = isHome ? null : selected;
  const ownList = !isHome && selected === me?.id;

  const { data: wishes } = trpc.wishlist.list.useQuery(
    { ownerId },
    // Not while a change is still being saved: a refetch landing now would bring the old list back for a moment.
    { enabled: !!me, refetchInterval: () => (hasPendingChanges("wishlist.list") ? false : 10_000) },
  );
  const wishlist = useWishlistActions();
  const showSkeleton = useDelayed(!household || !me);

  if (!household || !me) {
    return (
      <ListsPage>
        {showSkeleton && (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-11 w-64" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
      </ListsPage>
    );
  }

  // Everyone except housemates who have hidden their list — those don't appear at all.
  const people = [
    ...household.members.filter((m) => m.user.id === me.id),
    ...household.members.filter((m) => m.user.id !== me.id && m.wishlistVisible),
  ];
  const myMember = household.members.find((m) => m.user.id === me.id);
  const owner = household.members.find((m) => m.user.id === selected);
  const ownerName = owner?.user.name || owner?.user.email || "them";

  const canEdit = ownList || isHome;
  const all = (wishes ?? []) as WishData[];
  const active = all.filter((w) => !w.receivedAt);
  const received = all.filter((w) => w.receivedAt);
  const editingWish = all.find((w) => w.id === editing);

  const row = (wish: WishData) => {
    const isReceived = !!wish.receivedAt;
    const claimerName = wish.claimedBy ? wish.claimedBy.name || wish.claimedBy.email : null;
    // The owner never sees claims on their own list; that is the surprise.
    const claim =
      ownList || isReceived ? null : wish.claimedByMe ? (
        <Button type="button" variant="outline" size="sm" onClick={() => wishlist.unclaim({ id: wish.id })}>
          You&apos;re getting this · Unclaim
        </Button>
      ) : claimerName ? (
        <span className="text-sm text-muted-foreground">Claimed by {claimerName}</span>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => wishlist.claim({ id: wish.id })}>
          I&apos;ll get this
        </Button>
      );

    const price = wish.price !== null ? <AmountText value={wish.price} className="font-semibold" /> : undefined;

    return (
      <Row
        key={wish.id}
        title={wish.title}
        done={isReceived}
        wrapMeta
        meta={
          <>
            {wish.note}
            {wish.url && !canEdit && (
              <>
                {wish.note && " · "}
                <a href={wish.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                  Link ↗
                </a>
              </>
            )}
            {wish.url && canEdit && (wish.note ? " · has a link" : "Has a link")}
            {!ownList && isReceived && wish.claimedByMe && " · You gave this"}
          </>
        }
        trailing={
          claim || price ? (
            <span className="flex flex-col items-end gap-1.5">
              {price}
              {claim}
            </span>
          ) : undefined
        }
        onClick={canEdit ? () => setEditing(wish.id) : undefined}
      />
    );
  };

  const title = isHome ? "Home" : ownList ? "Your wishlist" : `${ownerName}'s wishlist`;
  const blurb = isHome
    ? "Things the whole household wants. Anyone can add, and everyone sees who's getting what."
    : ownList
      ? "You never see who has claimed something — that's the surprise."
      : `Claim something and ${ownerName} won't see it.`;

  return (
    <ListsPage
      actions={
        canEdit ? (
          <Button onClick={() => setAdding(true)}>
            <PlusIcon /> Wish
          </Button>
        ) : undefined
      }
    >
      <ChoiceChips
        label="Wishlists"
        value={selected}
        onChange={(v) => {
          setChoice(v);
          setAdding(false);
        }}
        options={[
          ...people.map((m) => ({ value: m.user.id, label: m.user.id === me.id ? "You" : m.user.name || m.user.email })),
          { value: HOME, label: "Home" },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{blurb}</p>
        </div>
        {ownList && myMember && (
          <label className="flex min-h-11 items-center gap-3 text-base md:text-sm">
            Visible to household
            <Switch
              checked={myMember.wishlistVisible}
              onCheckedChange={(visible) => wishlist.setVisibility({ visible })}
              aria-label="Visible to household"
            />
          </label>
        )}
      </div>

      {wishes && active.length === 0 ? (
        <EmptyState
          title={canEdit ? "No wishes yet." : "Nothing on this wishlist yet."}
          action={canEdit ? <Button onClick={() => setAdding(true)}>Add a wish</Button> : undefined}
        />
      ) : (
        <RowList>{active.map(row)}</RowList>
      )}

      {received.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowReceived((s) => !s)}
            aria-expanded={showReceived}
            className="justify-between px-0 text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase"
          >
            <span>Received · {received.length}</span>
            <span className="font-medium tracking-normal normal-case">{showReceived ? "Hide" : "Show"}</span>
          </Button>
          {showReceived && <RowList>{received.map(row)}</RowList>}
        </div>
      )}

      {adding && (
        <WishSheet
          onSubmit={(values) => wishlist.add({ home: isHome, ...values })}
          onClose={() => setAdding(false)}
        />
      )}

      {editingWish && (
        <WishSheet
          wish={editingWish}
          onSubmit={(values) => wishlist.update({ id: editingWish.id, ...values })}
          onSetReceived={(r) => wishlist.setReceived({ id: editingWish.id, received: r })}
          onDelete={() => {
            setEditing(null);
            setDeleting(editingWish);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title ?? ""}"?`}
        onConfirm={() => deleting && wishlist.remove({ id: deleting.id })}
      />
    </ListsPage>
  );
}
