# Movies & Series module

Terms follow `CONTEXT.md` (Title, Watchlist, Rating). Built 2026-11-10 on the pattern of Recipes.

## Behaviour

- Switchable Module `movies`, a tab under Lists.
- Watchlists follow the same ownership rules as Cookbooks (`src/server/ownership.ts`), with two Shared starters, "Movies" and "Series". A Household that still had the single starter "Watchlist" gets it renamed to "Movies" the next time someone opens the page, and its Series move to "Series".
- A Title is added from the button at the top right: its name, Movie or Series, and the Watchlist (by default the starter for its kind). Nothing is looked up: a lookup at TMDB (year, running time, description, poster) was built and removed again on 2026-11-10 as not needed. Its columns on `titles` are still in the database, unused.
- The list has three tools at the right, as icons: filter (status, kind), sort (what to watch next, recently added, name, highest rated, recently watched) and search by name. With no filter every status shows, what is being watched first.
- Status: Want to watch, Watching, Watched. Becoming Watched records the date.
- Rating: each Member's own, half a star to five, with a note. Any Member who can see a Title can rate it.
- A Series keeps the season and episode it has got to (2026-11-10); noting progress on one not started makes it Watching.
- Not built: where to stream, recommendations.
