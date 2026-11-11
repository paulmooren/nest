"use client";

import * as React from "react";
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
import { cn } from "@/lib/utils";

type Option<T extends string = string> = { value: T; label: string };

/** One thing a list can be narrowed by: its options, the one chosen, and which option means "don't narrow". */
export type ListFilter = { key: string; label: string; value: string; any: string; options: Option[] };

const ITEM = "min-h-11 md:min-h-8";
const ICON = "relative text-muted-foreground";

/**
 * The tools of a list, as quiet icons at its right: filter, sort, and search. Each is there only when the list
 * gives it something to do. A dot on an icon says that tool is narrowing or reordering the list; what is filtered
 * on is spelled out next to the count, with a way to clear it. `extra` is for one more icon of the page's own.
 */
export function ListTools<S extends string = string>({
  count,
  noun,
  filters = [],
  onFilter,
  sort,
  query,
  onQuery,
  searchPlaceholder = "Search",
  extra,
}: {
  /** How many rows are showing, and what one and several of them are called. */
  count: number;
  noun: [one: string, many: string];
  filters?: ListFilter[];
  onFilter?: (key: string, value: string) => void;
  /** `initial` is the order the list has when nobody chose one; any other gets the dot. */
  sort?: { value: S; initial: S; options: Option<S>[]; onChange: (value: S) => void };
  /** What is being searched for; null while the search field is closed. Leave `onQuery` out for a list with no search. */
  query?: string | null;
  onQuery?: (query: string | null) => void;
  searchPlaceholder?: string;
  extra?: React.ReactNode;
}) {
  const active = filters.filter((f) => f.value !== f.any);
  const said = active.map((f) => f.options.find((o) => o.value === f.value)?.label ?? "");
  const clear = () => active.forEach((f) => onFilter?.(f.key, f.any));
  const searching = query !== null && query !== undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-2 md:min-h-9">
        <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
          {count} {count === 1 ? noun[0] : noun[1]}
          {said.length > 0 && ` · ${said.join(" · ")}`}
          {active.length > 0 && (
            <button type="button" className="ml-2 font-medium text-foreground underline underline-offset-4" onClick={clear}>
              Clear
            </button>
          )}
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          {extra}

          {filters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" aria-label={active.length > 0 ? `Filter: ${said.join(", ")}` : "Filter"} className={ICON} />}
              >
                <ListFilterIcon />
                {active.length > 0 && <Dot />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {filters.map((f, i) => (
                  <React.Fragment key={f.key}>
                    {i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{f.label}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={f.value} onValueChange={(value) => onFilter?.(f.key, String(value))}>
                        {f.options.map((o) => (
                          <DropdownMenuRadioItem key={o.value} value={o.value} className={ITEM}>
                            {o.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </React.Fragment>
                ))}
                {active.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={ITEM} onClick={clear}>
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {sort && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Sort: ${sort.options.find((o) => o.value === sort.value)?.label ?? ""}`}
                    className={ICON}
                  />
                }
              >
                <ArrowUpDownIcon />
                {sort.value !== sort.initial && <Dot />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sort.value} onValueChange={(value) => sort.onChange(value as S)}>
                    {sort.options.map((o) => (
                      <DropdownMenuRadioItem key={o.value} value={o.value} className={ITEM}>
                        {o.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onQuery && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={searching ? "Close search" : "Search"}
              aria-expanded={searching}
              className={cn(ICON, searching && "bg-muted text-foreground")}
              onClick={() => onQuery(searching ? null : "")}
            >
              {searching ? <XIcon /> : <SearchIcon />}
            </Button>
          )}
        </div>
      </div>

      {onQuery && searching && (
        <Input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} autoFocus />
      )}
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-foreground md:top-1.5 md:right-1.5" />;
}
