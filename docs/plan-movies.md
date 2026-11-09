# Movies & Series module

Terms follow `CONTEXT.md` (Title, Watchlist, Rating). Built 2026-11-10 on the pattern of Recipes.

## Behaviour

- Switchable Module `movies`, a tab under Lists.
- Watchlists follow the same ownership rules as Cookbooks (`src/server/ownership.ts`), with a Shared starter "Watchlist".
- A Title is added by typing its name. With `TMDB_API_KEY` set, matches from TMDB are offered and choosing one keeps its year, running time, description and poster with the Title, so the list never depends on TMDB afterwards. Without the key, or when TMDB is down, the name is added as typed, as a Movie or a Series.
- Status: Want to watch, Watching, Watched. Becoming Watched records the date.
- Rating: each Member's own, half a star to five, with a note. Any Member who can see a Title can rate it.
- Not built: season and episode progress, where to stream, recommendations.

## Setup

- `TMDB_API_KEY`: a TMDB v3 API key or v4 read token, on Vercel and in `.env`. Optional.
- TMDB asks for the notice shown at the foot of the page once a Title from TMDB exists.
