# Movies & Series module

Terms follow `CONTEXT.md` (Title, Watchlist, Rating). Built 2026-11-10 on the pattern of Recipes.

## Behaviour

- Switchable Module `movies`, a tab under Lists.
- Watchlists follow the same ownership rules as Cookbooks (`src/server/ownership.ts`), with a Shared starter "Watchlist".
- A Title is added by typing its name and choosing Movie or Series. Nothing is looked up: a lookup at TMDB (year, running time, description, poster) was built and removed again on 2026-11-10 as not needed. Its columns on `titles` are still in the database, unused.
- Status: Want to watch, Watching, Watched. Becoming Watched records the date.
- Rating: each Member's own, half a star to five, with a note. Any Member who can see a Title can rate it.
- A Series keeps the season and episode it has got to (2026-11-10); noting progress on one not started makes it Watching.
- Not built: where to stream, recommendations.
