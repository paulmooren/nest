# Plan: Recipes module

Terms follow `CONTEXT.md` (Recipe, Ingredient, Cookbook). Movies & Series ships afterwards as a separate PR.

## Behaviour

- New switchable Module `recipes` (label "Recipes"), shown as a tab under Lists next to Shopping list and Wishlist.
- A Cookbook is Shared (`ownerId` null, default, any Member edits) or Personal (owner edits, `visibleToHousehold` controls read-only visibility for others; defaults to Visible, unlike Notebooks).
- Every Household has a Shared starter Cookbook "Recipes" that cannot be deleted or have its ownership changed.
- A Recipe has a name, free-text Ingredients (ordered lines), steps (Markdown), servings, optional photo, optional source link, and lives in exactly one Cookbook.
- Deleting a Cookbook asks where its Recipes go (default "Recipes") or offers to delete them; moving Personal Recipes into a Shared Cookbook shows a warning.
- Import from URL: server fetches the page, reads schema.org `Recipe` JSON-LD, and opens an editable draft. Nothing is saved until the Member saves. On failure the manual form opens with the link filled in.
- "Add to shopping list" on a Recipe: picker of Ingredients (all ticked), list chooser defaulting to the main Shared Shopping list, skips exact-name duplicates, reports how many were added. Each Ingredient line becomes a Shopping item name with no quantity.
- Search by name and Ingredient text within the readable Cookbooks.

## Data (prisma/schema.prisma + migration)

- `Cookbook`: id, householdId, ownerId?, visibleToHousehold (default true), isStarter, name, timestamps. Mirrors `Notebook`.
- `Recipe`: id, cookbookId, name, ingredients (String, one line each), steps, servings Int?, sourceUrl?, photoKey?, timestamps; `updatedAt` is the edit-conflict version, as for Note.
- Add relations on `User` and `Household`. Migration `<timestamp>_recipes`.
- Apply the same migration to the Demo database (`npm run demo:migrate`); see ADR 0005.

## Server

- `src/lib/modules.ts`: add `recipes`.
- `src/server/recipes-access.ts`: `readableCookbooks`, `editableCookbooks`, `ensureStarterCookbook` (copy the shape of `notes-access.ts`; extraction into a shared helper waits for Movies & Series).
- `src/server/api/routers/recipes.ts`, registered in `root.ts`: cookbook list/create/rename/delete (with destination), recipe list/get/create/update (conflict check)/delete/move, `search`, `importFromUrl`, `addToShopping`.
- `src/lib/recipe-import.ts`: pure JSON-LD parsing (handles `@graph`, arrays, `HowToStep`/`HowToSection`, ISO durations ignored), unit-tested.
- URL fetch guard: http(s) only, resolve DNS and refuse private, loopback and link-local addresses (also after redirects), 5 s timeout, 2 MB cap, no cookies. Write an ADR when this lands: the app now fetches Member-supplied URLs.
- Photos: reuse `vault-storage.ts` `putFile`/`getFile` under a `recipes/` key prefix, unencrypted, served by an authenticated route that checks Cookbook read access. Resize on the client before upload (about 1600 px, JPEG).

## UI

- `src/app/(app)/lists/recipes/` with layout, loading and page; `src/app/(app)/lists/recipes/[id]` for a Recipe; `.../new` for create and import.
- `src/components/recipes/`: Cookbook sheets, Recipe editor, Ingredient picker sheet.
- Update `src/app/(app)/lists/page.tsx` and the nav `modules` list in `nav-shell.tsx` so the Lists area opens with any of its three Modules.
- Follow AGENTS.md layout rules: unboxed opener, boxes for row collections, no outer box for lists on phones. Read `node_modules/next/dist/docs/` before writing routes.

## Tests and checks

- Unit: recipe import parsing, ingredient de-duplication, access filters.
- Router tests for visibility and edit rights (Personal hidden, Personal visible read-only, Shared edit), delete-with-destination, conflict refusal.
- Manual in the browser at phone and desktop widths: create, import success and failure, add to Shopping, Cookbook delete, Module switched off.
- Update the Demo seed (`src/server/demo/seed.ts`) with two Cookbooks and a few Recipes.

## Slices (each shippable)

1. Module flag, schema, access, Cookbooks and Recipes CRUD, list and search, Demo seed.
2. Add to shopping list.
3. Photo upload.
4. URL import with the fetch guard and ADR.

## Open decisions

- Photos in the existing Vault bucket (planned) or a separate bucket and env vars.

## Built beyond the first plan (2026-11-09)

- Adding: import on the editor (the link field on the Recipes page was removed again; "New recipe" is the one way in), paste a recipe as text, and (Android) share a page to Nest from the browser. Imports also bring the time and the page's photo (shown from the source site, not copied).
- Shopping: "Add to shopping list" with the servings chosen on the Recipe; "Shop for the plan" for every Planned meal.
- Cook mode: gather Ingredients, one step at a time, the Ingredients each step uses, timers from the times in a step, screen kept on, marks the Recipe as Cooked.
- Deciding: Meal plan for the next seven days, filters (under 30 min, not cooked yet, not cooked lately) and "Surprise me".
- Still open: uploading your own photo (needs the storage decision above).
