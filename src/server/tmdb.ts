import type { TitleKind } from "@/lib/movies";

/**
 * Looking films and series up at TMDB (themoviedb.org). Needs TMDB_API_KEY: either a v3 API key or a v4 read
 * token. Without it nothing here is called and Titles are typed in by hand.
 */
const BASE = "https://api.themoviedb.org/3";
const POSTER = "https://image.tmdb.org/t/p/w342";

export const tmdbAvailable = () => !!process.env.TMDB_API_KEY;

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY ?? "";
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // A v4 read token is a JWT and goes in a header; a v3 key is a query parameter.
  const bearer = key.includes(".");
  if (!bearer) url.searchParams.set("api_key", key);
  const res = await fetch(url, {
    headers: { accept: "application/json", ...(bearer ? { authorization: `Bearer ${key}` } : {}) },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`TMDB answered ${res.status}`);
  return (await res.json()) as T;
}

export type TmdbHit = { tmdbId: number; kind: TitleKind; name: string; year: number | null; posterUrl: string | null; overview: string | null };

type Raw = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  runtime?: number | null;
  episode_run_time?: number[];
};

const yearOf = (date?: string) => (date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);

function toHit(raw: Raw, kind: TitleKind): TmdbHit {
  return {
    tmdbId: raw.id,
    kind,
    name: (kind === "MOVIE" ? raw.title : raw.name) ?? raw.title ?? raw.name ?? "",
    year: yearOf(kind === "MOVIE" ? raw.release_date : raw.first_air_date),
    posterUrl: raw.poster_path ? POSTER + raw.poster_path : null,
    overview: raw.overview?.trim() || null,
  };
}

/** Films and series matching what was typed, best match first. */
export async function searchTmdb(query: string): Promise<TmdbHit[]> {
  const data = await tmdb<{ results: Raw[] }>("/search/multi", { query, include_adult: "false" });
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 8)
    .map((r) => toHit(r, r.media_type === "movie" ? "MOVIE" : "SERIES"))
    .filter((h) => h.name);
}

/** Everything kept about one film or series, including how long it runs (a series: one episode). */
export async function tmdbDetails(tmdbId: number, kind: TitleKind): Promise<TmdbHit & { runtimeMinutes: number | null }> {
  const raw = await tmdb<Raw>(`/${kind === "MOVIE" ? "movie" : "tv"}/${tmdbId}`);
  const runtime = kind === "MOVIE" ? raw.runtime : raw.episode_run_time?.[0];
  return { ...toHit(raw, kind), runtimeMinutes: runtime && runtime > 0 ? runtime : null };
}
