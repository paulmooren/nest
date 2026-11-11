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
import { ListTools } from "@/components/ui/list-tools";
import { Stars } from "@/components/movies/stars";
import { AddTitleSheet, TitleSheet, type TitleRow } from "@/components/movies/title-sheet";
import { CookbookSettingsSheet, DeleteCookbookSheet, NewCookbookSheet } from "@/components/recipes/cookbook-sheets";
import { RecipesBones } from "@/components/recipes/recipes-ui";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";
import { averageHalfStars, KIND_LABEL, progressLabel, STATUS_LABEL, STATUSES, type TitleKind, type TitleStatus } from "@/lib/movies";

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
  const [filter, setFilter] = useState<TitleFilter>(NO_FILTER);
  const [sort, setSort] = useState<TitleSort>("status");
  const [query, setQuery] = useState<string | null>(null);
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
  const q = (query ?? "").trim().toLowerCase();
  const visible = inList
    .filter((t) => (filter.status === "ANY" || t.status === filter.status) && (filter.kind === "ANY" || t.kind === filter.kind) && (!q || t.name.toLowerCase().includes(q)))
    .sort(BY[sort]);
  const narrowed = filter.status !== "ANY" || filter.kind !== "ANY" || q !== "";
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
    const meta = [KIND_LABEL[t.kind], STATUS_LABEL[t.status], t.status === "WATCHING" ? progressLabel(t) : null].filter(Boolean).join(" · ");
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

        {titles.length > 0 && (
          <ListTools
            count={visible.length}
            noun={["title", "titles"]}
            filters={[
              {
                key: "status",
                label: "Status",
                value: filter.status,
                any: "ANY",
                options: [{ value: "ANY", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))],
              },
              {
                key: "kind",
                label: "Kind",
                value: filter.kind,
                any: "ANY",
                options: [
                  { value: "ANY", label: "Movies and series" },
                  { value: "MOVIE", label: "Movies" },
                  { value: "SERIES", label: "Series" },
                ],
              },
            ]}
            onFilter={(key, value) => setFilter((f) => ({ ...f, [key]: value }))}
            sort={{ value: sort, initial: "status", options: SORTS, onChange: setSort }}
            query={query}
            onQuery={setQuery}
            searchPlaceholder="Search titles by name"
          />
        )}

        {visible.length === 0 ? (
          <EmptyState
            title={
              titles.length === 0
                ? "Nothing to watch yet. Add a film or a series you want to see."
                : narrowed
                  ? "Nothing matches the filter or the search."
                  : "Nothing on this watchlist yet."
            }
            action={
              narrowed ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter(NO_FILTER);
                    setQuery(null);
                  }}
                >
                  Show everything
                </Button>
              ) : undefined
            }
          />
        ) : (
          <section aria-label="Titles">
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
              setFilter(NO_FILTER);
              setQuery(null);
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

type TitleFilter = { status: TitleStatus | "ANY"; kind: TitleKind | "ANY" };
type TitleSort = "status" | "added" | "name" | "rating" | "watched";
const NO_FILTER: TitleFilter = { status: "ANY", kind: "ANY" };
const SORTS: { value: TitleSort; label: string }[] = [
  { value: "status", label: "What to watch next" },
  { value: "added", label: "Recently added" },
  { value: "name", label: "Name" },
  { value: "rating", label: "Highest rated" },
  { value: "watched", label: "Recently watched" },
];

const STATUS_ORDER: Record<TitleStatus, number> = { WATCHING: 0, WANT: 1, WATCHED: 2 };
const added = (a: TitleRow, b: TitleRow) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
const time = (d: Date | string | null) => (d ? new Date(d).getTime() : 0);

/** The ways to order the list. Each falls back to newest first, so the order never jumps about. */
const BY: Record<TitleSort, (a: TitleRow, b: TitleRow) => number> = {
  // What is being watched, then what is waiting, then what is done.
  status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || added(a, b),
  added,
  name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  rating: (a, b) => (averageHalfStars(b.ratings) ?? -1) - (averageHalfStars(a.ratings) ?? -1) || added(a, b),
  watched: (a, b) => time(b.watchedAt) - time(a.watchedAt) || added(a, b),
};
