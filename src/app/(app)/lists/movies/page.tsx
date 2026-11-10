"use client";

import { useState } from "react";
import { ClapperboardIcon, PlusIcon, SettingsIcon, TvIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { AddChip, ChoiceChips } from "@/components/ui/choice-chips";
import { EmptyState } from "@/components/ui/empty-state";
import { Row, RowList } from "@/components/ui/row";
import { ListsPage } from "@/components/lists/lists-page";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";
import { Stars } from "@/components/movies/stars";
import { AddTitleSheet, TitleSheet, type TitleRow } from "@/components/movies/title-sheet";
import { CookbookSettingsSheet, DeleteCookbookSheet, NewCookbookSheet } from "@/components/recipes/cookbook-sheets";
import { RecipesBones } from "@/components/recipes/recipes-ui";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";
import { cn } from "@/lib/utils";
import { averageHalfStars, KIND_LABEL, progressLabel, STATUS_LABEL, STATUSES, type TitleStatus } from "@/lib/movies";

export default function MoviesPage() {
  return (
    <ModuleGate module="movies">
      <Movies />
    </ModuleGate>
  );
}

function Movies() {
  const utils = trpc.useUtils();
  const refresh = () => Promise.all([utils.movies.list.invalidate(), utils.movies.listWatchlists.invalidate()]);
  const { data: titles } = trpc.movies.list.useQuery();
  const { data: watchlists } = trpc.movies.listWatchlists.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!titles || !watchlists || !me);

  const [watchlistId, setWatchlistId] = useState("all");
  const [status, setStatusFilter] = useState<TitleStatus>("WANT");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [adding, setAdding] = useState(false);
  const create = trpc.movies.create.useMutation({ onSuccess: refresh });
  const createWatchlist = trpc.movies.createWatchlist.useMutation({ onSuccess: refresh });
  const renameWatchlist = trpc.movies.renameWatchlist.useMutation({ onSuccess: refresh });
  const setVisibility = trpc.movies.setWatchlistVisibility.useMutation({ onSuccess: refresh });
  const deleteWatchlist = trpc.movies.deleteWatchlist.useMutation({ onSuccess: refresh });

  if (!titles || !watchlists || !me) return <ListsPage>{showSkeleton && <RecipesBones />}</ListsPage>;


  const members = household?.members ?? [];
  const canEditList = (w?: { ownerId: string | null }) => !!w && (w.ownerId === null || w.ownerId === me.id);
  const editable = watchlists.filter(canEditList);
  const selected = watchlists.find((w) => w.id === watchlistId);
  const inList = watchlistId === "all" ? titles : titles.filter((t) => t.watchlistId === watchlistId);
  const visible = inList.filter((t) => t.status === status);
  const counts = new Map<TitleStatus, number>();
  for (const t of inList) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  const open = titles.find((t) => t.id === openId);
  const destinations = editable.filter((w) => w.id !== selected?.id);

  const addButton =
    editable.length > 0 ? (
      <Button onClick={() => setAdding(true)}>
        <PlusIcon /> Film or series
      </Button>
    ) : undefined;

  const row = (t: TitleRow) => {
    const average = averageHalfStars(t.ratings);
    const meta = [KIND_LABEL[t.kind], t.status === "WATCHING" ? progressLabel(t) : null].filter(Boolean).join(" · ");
    return (
      <Row
        key={t.id}
        onClick={() => setOpenId(t.id)}
        leading={
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {t.kind === "MOVIE" ? <ClapperboardIcon className="size-4" aria-hidden /> : <TvIcon className="size-4" aria-hidden />}
          </span>
        }
        title={t.name}
        meta={meta}
        trailing={average !== null ? <Stars halfStars={average} /> : undefined}
      />
    );
  };

  return (
    <>
      <ListsPage actions={addButton}>
        <div className="flex flex-col gap-3">
          <ChoiceChips
            label="Filter by watchlist"
            value={watchlistId}
            onChange={setWatchlistId}
            options={[{ value: "all", label: "All" }, ...watchlists.map((w) => ({ value: w.id, label: `${w.name} ${w.titleCount}` }))]}
            trailing={<AddChip onClick={() => setCreating(true)}>New watchlist</AddChip>}
          />
          <StatusFilter value={status} onChange={setStatusFilter} counts={counts} />
        </div>

        {selected && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.ownerId === null
                  ? "Shared — everyone in your household"
                  : selected.ownerId === me.id
                    ? selected.visibleToHousehold
                      ? "Personal — visible to your household"
                      : "Personal — only you"
                    : "Personal — visible to you"}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Settings for ${selected.name}`} onClick={() => setSettings(true)}>
              <SettingsIcon />
            </Button>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState
            title={
              titles.length === 0
                ? "Nothing to watch yet. Add a film or a series you want to see."
                : status === "WANT"
                  ? "Nothing waiting to be watched here."
                  : status === "WATCHING"
                    ? "Nothing being watched here right now."
                    : "Nothing watched here yet. Mark a title as Watched and rate it."
            }
          />
        ) : (
          <section aria-label={STATUS_LABEL[status]}>
            <RowList>{visible.map(row)}</RowList>
          </section>
        )}

      </ListsPage>

      {adding && (
        <AddTitleSheet
          watchlists={editable}
          current={canEditList(selected) ? selected : undefined}
          onClose={() => setAdding(false)}
          onAdd={async (input) => {
            try {
              await create.mutateAsync({ id: newId(), ...input });
              setStatusFilter("WANT");
              showToast(`${input.name} added to ${watchlists.find((w) => w.id === input.watchlistId)?.name ?? "the watchlist"}`);
            } catch (e) {
              showToast("Couldn't add that title");
              throw e;
            }
          }}
        />
      )}
      {open && (
        <TitleSheet
          key={open.id}
          title={open}
          meId={me.id}
          members={members}
          canEdit={canEditList(watchlists.find((w) => w.id === open.watchlistId))}
          watchlists={editable}
          onChanged={refresh}
          onClose={() => setOpenId(null)}
        />
      )}
      {creating && (
        <NewCookbookSheet
          kind="watchlist"
          onClose={() => setCreating(false)}
          onCreate={async (name, shared) => {
            const id = newId();
            await createWatchlist.mutateAsync({ id, name, shared });
            setWatchlistId(id);
          }}
        />
      )}
      {settings && selected && (
        <CookbookSettingsSheet
          kind="watchlist"
          cookbook={{ ...selected, recipeCount: selected.titleCount }}
          mine={canEditList(selected)}
          multiMember={members.length > 1}
          onClose={() => setSettings(false)}
          onRename={(name) => renameWatchlist.mutate({ id: selected.id, name })}
          onVisibility={(visible) => setVisibility.mutate({ id: selected.id, visible })}
          onDelete={() => {
            setSettings(false);
            setDeleting(true);
          }}
        />
      )}
      {deleting && selected && (
        <DeleteCookbookSheet
          kind="watchlist"
          cookbook={{ ...selected, recipeCount: selected.titleCount }}
          destinations={destinations}
          onClose={() => setDeleting(false)}
          onConfirm={async (moveTo) => {
            await deleteWatchlist.mutateAsync({ id: selected.id, moveTo });
            setWatchlistId("all");
          }}
        />
      )}
    </>
  );
}

/**
 * Which Titles to show: one strip with three segments, each with its count. It is a filter on the list below, so
 * it is drawn as one control rather than as chips, which on this page mean "which Watchlist".
 */
function StatusFilter({ value, onChange, counts }: { value: TitleStatus; onChange: (status: TitleStatus) => void; counts: Map<TitleStatus, number> }) {
  return (
    <div role="radiogroup" aria-label="Status" className="flex w-full rounded-xl bg-muted p-1 md:w-fit">
      {STATUSES.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 text-sm font-medium whitespace-nowrap transition-colors md:flex-none md:px-4",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {STATUS_LABEL[s]}
            <span className={cn("text-xs tabular-nums", active ? "text-muted-foreground" : "text-muted-foreground/70")}>{counts.get(s) ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
