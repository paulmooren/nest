/** The two Shared Watchlists every Household starts with. They can't be renamed or deleted. */
export const STARTER_MOVIES = "Movies";
export const STARTER_SERIES = "Series";
export const TITLE_NAME_MAX = 200;
export const RATING_NOTE_MAX = 500;

export type TitleKind = "MOVIE" | "SERIES";
export type TitleStatus = "WANT" | "WATCHING" | "WATCHED";

export const KIND_LABEL: Record<TitleKind, string> = { MOVIE: "Movie", SERIES: "Series" };
export const STATUS_LABEL: Record<TitleStatus, string> = { WANT: "Want to watch", WATCHING: "Watching", WATCHED: "Watched" };
export const STATUSES: TitleStatus[] = ["WANT", "WATCHING", "WATCHED"];

/** Half stars (1–10) as "3.5". */
export const starsLabel = (halfStars: number) => String(halfStars / 2);

/** The average of the ratings given, in half stars rounded to the nearest half; null when nobody rated. */
export function averageHalfStars(ratings: { halfStars: number | null }[]): number | null {
  const given = ratings.map((r) => r.halfStars).filter((h): h is number => h !== null);
  if (given.length === 0) return null;
  return Math.round(given.reduce((a, b) => a + b, 0) / given.length);
}

/** "S2 · E5", "S2" or "E5": where a Series has got to; null when nobody is keeping track. */
export function progressLabel(title: { season: number | null; episode: number | null }): string | null {
  const parts = [title.season !== null ? `S${title.season}` : null, title.episode !== null ? `E${title.episode}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
