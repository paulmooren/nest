"use client";

import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { ClapperboardIcon, SettingsIcon, TvIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { AddChip, ChoiceChips } from "@/components/ui/choice-chips";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Row, RowList } from "@/components/ui/row";
import { ListsPage } from "@/components/lists/lists-page";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";
import { Stars } from "@/components/movies/stars";
import { TitleSheet, type TitleRow } from "@/components/movies/title-sheet";
import { CookbookSettingsSheet, DeleteCookbookSheet, NewCookbookSheet } from "@/components/recipes/cookbook-sheets";
import { RecipePhoto, RecipesBones } from "@/components/recipes/recipes-ui";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";
import { averageHalfStars, KIND_LABEL, progressLabel, STATUS_LABEL, STATUSES, type TitleKind, type TitleStatus } from "@/lib/movies";
import { formatMinutes } from "@/lib/recipes";

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

  // What is typed to add a Title, and the same a moment later, which is what is looked up.
  const [typed, setTyped] = useState("");
  const [asked, setAsked] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setAsked(typed.trim()), 300);
    return () => clearTimeout(t);
  }, [typed]);
  const { data: found, isFetching: looking } = trpc.movies.search.useQuery(
    { query: asked },
    { enabled: asked.length >= 2, placeholderData: keepPreviousData, staleTime: 60_000 },
  );

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
  const starter = watchlists.find((w) => w.isStarter);
  // New Titles go on the Watchlist being looked at when it is yours or shared, otherwise the starter one.
  const target = canEditList(selected) ? selected : starter;
  const inList = watchlistId === "all" ? titles : titles.filter((t) => t.watchlistId === watchlistId);
  const visible = inList.filter((t) => t.status === status);
  const counts = new Map<TitleStatus, number>();
  for (const t of inList) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  const open = titles.find((t) => t.id === openId);
  const destinations = editable.filter((w) => w.id !== selected?.id);

  const add = async (input: { name: string; kind: TitleKind; tmdbId?: number; year?: number | null }) => {
    if (!target) return;
    try {
      await create.mutateAsync({ id: newId(), watchlistId: target.id, ...input });
      setTyped("");
      setAsked("");
      setStatusFilter("WANT");
      showToast(`${input.name} added to ${target.name}`);
    } catch {
      showToast("Couldn't add that title");
    }
  };

  const hits = typed.trim().length >= 2 && asked === typed.trim() ? (found?.hits ?? []) : [];
  const canLookUp = found?.available !== false;

  const row = (t: TitleRow) => {
    const average = averageHalfStars(t.ratings);
    const meta = [KIND_LABEL[t.kind], t.year, t.status === "WATCHING" ? progressLabel(t) : null, t.runtimeMinutes ? formatMinutes(t.runtimeMinutes) : null]
      .filter(Boolean)
      .join(" · ");
    return (
      <Row
        key={t.id}
        onClick={() => setOpenId(t.id)}
        leading={
          t.posterUrl ? (
            <RecipePhoto src={t.posterUrl} className="h-14 w-10 rounded-md" />
          ) : (
            <span className="flex h-14 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {t.kind === "MOVIE" ? <ClapperboardIcon className="size-4" aria-hidden /> : <TvIcon className="size-4" aria-hidden />}
            </span>
          )
        }
        title={t.name}
        meta={meta}
        trailing={average !== null ? <Stars halfStars={average} /> : undefined}
      />
    );
  };

  return (
    <>
      <ListsPage>
        <div className="flex flex-col gap-2 md:max-w-xl">
          <Input
            type="search"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Add a film or series"
            aria-label="Film or series to add"
            disabled={!target}
          />
          {typed.trim().length >= 2 && (
            <ul aria-label="Titles to add" className="flex flex-col divide-y divide-border/70 rounded-2xl border bg-card px-3">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.tmdbId}`}>
                  <button
                    type="button"
                    disabled={create.isPending}
                    className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                    onClick={() => add({ name: h.name, kind: h.kind, tmdbId: h.tmdbId, year: h.year })}
                  >
                    {h.posterUrl ? <RecipePhoto src={h.posterUrl} className="h-12 w-8 shrink-0 rounded" /> : <span className="h-12 w-8 shrink-0 rounded bg-muted" />}
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium md:text-sm">{h.name}</span>
                      <span className="block text-sm text-muted-foreground md:text-xs">{[KIND_LABEL[h.kind], h.year].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li className="flex flex-wrap items-center gap-2 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {looking && canLookUp ? "Looking it up…" : hits.length > 0 ? "Not in the list? Add it as typed:" : `Add “${typed.trim()}” as typed:`}
                </span>
                <Button variant="outline" size="sm" disabled={create.isPending} onClick={() => add({ name: typed.trim(), kind: "MOVIE" })}>
                  Movie
                </Button>
                <Button variant="outline" size="sm" disabled={create.isPending} onClick={() => add({ name: typed.trim(), kind: "SERIES" })}>
                  Series
                </Button>
              </li>
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <ChoiceChips
            label="Filter by watchlist"
            value={watchlistId}
            onChange={setWatchlistId}
            options={[{ value: "all", label: "All" }, ...watchlists.map((w) => ({ value: w.id, label: `${w.name} ${w.titleCount}` }))]}
            trailing={<AddChip onClick={() => setCreating(true)}>New watchlist</AddChip>}
          />
          <ChoiceChips<TitleStatus>
            label="Status"
            value={status}
            onChange={setStatusFilter}
            options={STATUSES.map((s) => ({ value: s, label: `${STATUS_LABEL[s]} ${counts.get(s) ?? 0}` }))}
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

        {visible.length === 0 ? (
          <EmptyState
            title={
              titles.length === 0
                ? "Nothing to watch yet. Type a film or series above to add it."
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

        {titles.some((t) => t.tmdbId !== null) && (
          <p className="text-xs text-muted-foreground">Film and series details come from TMDB. Nest uses the TMDB API but is not endorsed or certified by TMDB.</p>
        )}
      </ListsPage>

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
