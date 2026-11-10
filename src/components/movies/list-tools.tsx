"use client";

import { ArrowUpDownIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { KIND_LABEL, STATUS_LABEL, STATUSES, type TitleKind, type TitleStatus } from "@/lib/movies";
import { cn } from "@/lib/utils";

export type TitleFilter = { status: TitleStatus | "ANY"; kind: TitleKind | "ANY" };
export type TitleSort = "status" | "added" | "name" | "rating" | "watched";

export const NO_FILTER: TitleFilter = { status: "ANY", kind: "ANY" };
export const SORT_LABEL: Record<TitleSort, string> = {
  status: "What to watch next",
  added: "Recently added",
  name: "Name",
  rating: "Highest rated",
  watched: "Recently watched",
};

const ITEM = "min-h-11 md:min-h-8";

/**
 * The tools of the Titles list, as three quiet icons at the right: filter (by status and kind), sort, and search by
 * name. A dot on an icon says that tool is narrowing or reordering the list; what is filtered on is spelled out
 * next to the count, with a way to clear it.
 */
export function ListTools({
  count,
  filter,
  onFilter,
  sort,
  onSort,
  query,
  onQuery,
}: {
  /** How many Titles are showing. */
  count: number;
  filter: TitleFilter;
  onFilter: (filter: TitleFilter) => void;
  sort: TitleSort;
  onSort: (sort: TitleSort) => void;
  /** What is being searched for; null while the search field is closed. */
  query: string | null;
  onQuery: (query: string | null) => void;
}) {
  const filtering = filter.status !== "ANY" || filter.kind !== "ANY";
  const said = [filter.status !== "ANY" ? STATUS_LABEL[filter.status] : null, filter.kind !== "ANY" ? KIND_LABEL[filter.kind] : null].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-2 md:min-h-9">
        <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
          {count} {count === 1 ? "title" : "titles"}
          {said.length > 0 && ` · ${said.join(" · ")}`}
          {filtering && (
            <button type="button" className="ml-2 font-medium text-foreground underline underline-offset-4" onClick={() => onFilter(NO_FILTER)}>
              Clear
            </button>
          )}
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label={filtering ? `Filter: ${said.join(", ")}` : "Filter"} className="relative text-muted-foreground" />}
            >
              <ListFilterIcon />
              {filtering && <Dot />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filter.status} onValueChange={(status) => onFilter({ ...filter, status: status as TitleFilter["status"] })}>
                  <DropdownMenuRadioItem value="ANY" className={ITEM}>
                    Any status
                  </DropdownMenuRadioItem>
                  {STATUSES.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s} className={ITEM}>
                      {STATUS_LABEL[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Kind</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filter.kind} onValueChange={(kind) => onFilter({ ...filter, kind: kind as TitleFilter["kind"] })}>
                  <DropdownMenuRadioItem value="ANY" className={ITEM}>
                    Movies and series
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="MOVIE" className={ITEM}>
                    Movies
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="SERIES" className={ITEM}>
                    Series
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              {filtering && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className={ITEM} onClick={() => onFilter(NO_FILTER)}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label={`Sort: ${SORT_LABEL[sort]}`} className="relative text-muted-foreground" />}
            >
              <ArrowUpDownIcon />
              {sort !== "status" && <Dot />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={(next) => onSort(next as TitleSort)}>
                  {(Object.keys(SORT_LABEL) as TitleSort[]).map((s) => (
                    <DropdownMenuRadioItem key={s} value={s} className={ITEM}>
                      {SORT_LABEL[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            aria-label={query === null ? "Search" : "Close search"}
            aria-expanded={query !== null}
            className={cn("relative text-muted-foreground", query !== null && "bg-muted text-foreground")}
            onClick={() => onQuery(query === null ? "" : null)}
          >
            {query === null ? <SearchIcon /> : <XIcon />}
          </Button>
        </div>
      </div>

      {query !== null && (
        <Input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search by name" aria-label="Search titles by name" autoFocus />
      )}
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-foreground md:top-1.5 md:right-1.5" />;
}
