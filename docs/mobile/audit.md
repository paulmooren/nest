# Mobile audit

Captured 2026-10-17 against the Demo (`npm run demo:dev`, port 3100) with `tests/mobile/audit.mjs`
(Playwright, touch emulation, DPR 2). Widths: 320, 360, 390, 430 and 768. Screenshots and raw
metrics are in `.visual/mobile/` (git-ignored; re-run the script to regenerate).

Metrics counted per route: horizontal overflow, interactive elements under 44×44px, inputs under 16px,
text nodes under 12px. Counts are DOM elements, so a repeated row multiplies them; use them to rank, not as exact scores.

**Not yet verified (needs a real device or the strategy's test pass):** on-screen keyboard behaviour, real
iOS Safari safe-area and standalone mode, touch drag-and-drop, Lighthouse/INP numbers, dark mode (the app is
light only, `color-scheme: light`), offline behaviour.

## Summary numbers (390px)

| Route | Targets <44px | Inputs <16px | Text <12px | Notes |
|---|---|---|---|---|
| signin / signup | 0 | 0 | 1 | Good. Only clean routes. |
| dashboard | 42 | 0 | 9 | Steppers 32px, row actions 28px |
| finance/budgets | 52 | 0 | 30 | Row layout breaks (see B1) |
| finance/transactions | **567** | 0 | **217** | Page is ~13,000 CSS px tall (see T1) |
| finance/accounts | 28 | 0 | 15 | Overflows at 320px (see A1) |
| tasks | 59 | 0 | 12 | |
| lists/shopping | 39 | 0 | 8 | |
| lists/wishlist | 22 | 0 | 11 | |
| vault | 18 | 0 | 16 | Edit/delete icons are 16×16 |
| settings/* | 11–42 | up to **12** | 7 | Categories page has 12 small inputs |

Horizontal page overflow: only `accounts` at 320px (page scrollWidth 339). `budgets` has elements pushed past
the edge at 320 and 360 (icon buttons at x=333–389) inside a layout that is already squeezed. No route
overflows at 390 or wider.

## Findings

Severity: **H** blocks or badly hurts a core task, **M** noticeably degrades it, **L** polish.

### Shell and navigation

| # | Sev | Problem | Where |
|---|---|---|---|
| S1 | H | The bottom bar holds six items (Dashboard, Finance, Tasks, Lists, Vault, More) at 10.5px labels. Each target is ~36–40px wide, under 44px. At 320px the bar overflows (`nav` right edge at 339). The "More" slot is Settings, not a real overflow menu. | `app-shell.tsx:108` |
| S2 | M | The bar is built from hard-coded rgba/`bg-bg` and has no active indicator beyond text colour; labels at 10.5px are below comfortable reading size. | `app-shell.tsx` |
| S3 | M | No `viewport-fit=cover`, so `env(safe-area-inset-*)` is 0 in standalone iOS and the bar padding does nothing on notched devices. The `viewport` export only sets `themeColor`. | `layout.tsx:30` |
| S4 | M | `min-h-screen` (100vh) used on the shell and auth frame. On mobile browsers 100vh is taller than the visible area; should be `dvh` (or `svh`). | `app-shell.tsx:63,131`, `auth-frame.tsx:10,20` |
| S5 | M | Page header puts title, Demo badge and a free-form `<PageActions>` slot in one wrapping row. Action buttons (e.g. "Import CSV", "+ Transaction") wrap under the title and are not thumb-reachable at the top of a long page. | `app-shell.tsx:133–142` |
| S6 | L | Page title is 26px bold plus a full "Good evening, Alex" on the dashboard; on small screens the greeting eats ~140px before any content. | `app-shell.tsx` |
| S7 | L | Shell never sets `overscroll-behavior`, `touch-action`, or `-webkit-tap-highlight-color`; no pull-to-refresh and no controlled rubber-banding in standalone mode. | `globals.css` |

### Finance: transactions (worst screen)

| # | Sev | Problem |
|---|---|---|
| T1 | H | The list is a wide table inside `overflow-x-auto`. At 390px only name, date and a clipped category are visible; **the amount column is off-screen** and the category label is cut ("Housing & Utilitie…"). The money figure, the most important cell, requires a horizontal scroll to find. `transactions/page.tsx:295` |
| T2 | H | Page size is 200 rows rendered at once. On a phone the full-page height is ~13,000 CSS px, 567 interactive elements and 217 sub-12px text nodes. No virtualisation or date grouping; heavy for scroll performance and for finding anything. `transactions/page.tsx:47` |
| T3 | H | Every row has a category control, a recurring marker and a delete/edit affordance, all well under 44px. Mis-taps on a dense list are likely. |
| T4 | M | Filters (account, category, date, search) render inline above the list and push content down; no collapsed "Filters (2)" sheet pattern. |
| T5 | M | Primary actions "Import CSV" and "+ Transaction" sit in the page header at the top; after scrolling they are unreachable without scrolling back (no sticky or FAB action). |
| T6 | M | CSV import modal contains a preview `<table>` (`:817`) in a horizontally scrolling box; fine as a power-user flow but needs a stepper layout on a phone. |

### Finance: budgets

| # | Sev | Problem |
|---|---|---|
| B1 | H | Budget rows squeeze their text column when they hold a drag handle, colour bar, amount, "Visible to household" pill and three icon buttons. At 390px the description wraps one word per line ("Every / month / · / next / 25/10/2026"), and text overlaps the amount (visible in the Income group: "Net amount" collides with "varies" and "€3,420.00"). `budgets/page.tsx` |
| B2 | H | Icon buttons (history, edit, delete) are 16×16 and sit at x=333–389 on a 390 screen, edge to edge; at 320/360 they overflow. |
| B3 | M | Drag-and-drop reorder uses only `PointerSensor` with a 4px distance and a keyboard sensor, no `TouchSensor` or long-press delay. On touch, dragging a row competes with scrolling, so reorder is unreliable or accidentally triggered. `sortable-list.tsx:34,84` |
| B4 | M | Recurring-detection card ("Not recurring" outlined buttons, checkboxes) is readable but buttons are ~44px tall and use a wide text label; fine. Needs a decision on whether it belongs on this screen at all. |
| B5 | M | The page is 1,091 lines with all states in one component, so every visit ships all of its editing UI. Candidate for splitting and lazy loading. |

### Finance: accounts

| # | Sev | Problem |
|---|---|---|
| A1 | H | At 320px the page scrolls horizontally (339px wide): row action buttons ("Edit" 12px text, `px-2 py-1`) push past the edge. The memory notes a previous long-name overlap fix (`truncate`); the underlying row has no mobile layout. |
| A2 | M | Row buttons are text buttons at 12px with ~26px height. |

### Dashboard

| # | Sev | Problem |
|---|---|---|
| D1 | M | Shopping card has quantity steppers 32×32, checkbox 28×28, row item name 58×23 as a tap target (opens inline edit). Rows are 52px tall, but their controls are individually small. |
| D2 | M | Task snapshot: the title truncates ("Hoover the living …") while the overdue label and assignee avatar are given more room. |
| D3 | L | Net worth card shows two large figures side by side ("Yours" and "Household"); at 320px the larger figure risks wrapping. Sparkline/chart is not shown on mobile; check. |

### Tasks

| # | Sev | Problem |
|---|---|---|
| K1 | H | Every row has an always-visible trash icon (16×16) next to the assignee avatar (28×28) and priority pill (26px tall). A mis-tap deletes (confirm dialog exists, but the target is tiny and adjacent to the avatar). |
| K2 | M | Titles truncate at ~16 characters because priority pill, avatar and trash all claim width. Truncated task titles are the core content. |
| K3 | M | Reminders: schedule text is a dotted-underline link ("Every week") that opens a menu; the dotted underline is a desktop-style affordance. The "last done 3 days ago by Sam" text wraps awkwardly (hanging indent). |
| K4 | M | Todo checkbox is 24×24 (needs a 44px hit area; the visual can stay small). |
| K5 | L | Filter chips (All / You / Sam) are 44px tall: good, a pattern to keep. |

### Lists

| # | Sev | Problem |
|---|---|---|
| L1 | M | Shopping/Wishlist switch and list switcher are 34–36px tall chips. Acceptable visually but below 44px. |
| L2 | M | Shopping row: checkbox, stepper and name are separately tappable and small (see D1). In a supermarket, one-handed ticking is the core use case. |
| L3 | L | The favourites sheet (`shopping-view.tsx:289`) is already a proper bottom sheet with a safe-area inset: the best existing example of the target pattern. |

### Vault

| # | Sev | Problem |
|---|---|---|
| V1 | H | Edit and delete are 16×16 icon buttons next to a 69×33 "Reveal" button. Deleting a vault entry by mis-tap is the worst outcome in the app. |
| V2 | M | "+ New entry" is a 40px button in the header; no sticky action. |

### Settings

| # | Sev | Problem |
|---|---|---|
| E1 | H | Inputs render at 13–14px (3 on profile, 12 on categories, 1 on household). iOS Safari zooms the page when an input under 16px is focused, and does not zoom back. |
| E2 | M | Settings sub-navigation uses the horizontal-scroll `TabBar` (`tab-bar.tsx`); the active tab can sit off-screen without scrolling into view. |
| E3 | L | "More" in the bottom bar goes straight to Settings, which looks like a list of tabs rather than a mobile settings screen. |

### Modals, popovers and selects

| # | Sev | Problem |
|---|---|---|
| M1 | M | `Modal` is already a bottom sheet below `sm` (good), but: height is `max-h-[92vh]` (not `dvh`), no `safe-area-inset-bottom` padding on the content, no drag handle or swipe-to-dismiss, close button is 32×32, and with the keyboard open the sheet has no `visualViewport` handling. `modal.tsx:57–75` |
| M2 | M | Popover menus (assignee, priority, schedule) and the `Select` are desktop popovers anchored to tiny targets. On a phone these should present as action sheets / pickers. `popover-menu.tsx`, `ui/select.tsx` |
| M3 | M | Tooltips (`ui/tooltip.tsx`) carry information such as "Recurring · …" that touch users cannot reach (hover or keyboard focus only). |
| M4 | L | Focus management deliberately avoids opening the keyboard on touch (good) but means the first field is not focused when adding a transaction by tap; acceptable, revisit once the form is redesigned. |

### Auth

| # | Sev | Problem |
|---|---|---|
| U1 | L | Sign-in and sign-up have 0 small targets, no small inputs, and no overflow at 320px. Keep as the baseline. Check `autocomplete`, `inputMode`, `enterKeyHint` and password-manager attributes, which the metrics do not cover. |

### Cross-cutting

| # | Sev | Problem |
|---|---|---|
| X1 | H | Across the app, 200+ sub-12px text nodes and 40+ interactive elements per screen are below 44px. The design language (12.5–14px type, 16–28px icon buttons) is desktop-density. |
| X2 | M | 52 files use `hover:` styles; hover is the only cue for several affordances (inline-edit, icon buttons). No `:active` pressed states. |
| X3 | M | No offline or error states beyond React Query defaults; the service worker is a pass-through (`public/sw.js`), so a dropped connection in a supermarket shows a blank or error page. |
| X4 | L | Dev-only: the Next.js dev badge overlaps the bottom bar in screenshots. Not a product bug. |
| X5 | L | Full-page screenshots draw the fixed bottom bar mid-page; ignore it in the images. |

## What already works (keep)

- Sign-in/sign-up layouts.
- The bottom-sheet behaviour of `Modal` below `sm`, and the favourites sheet.
- Filter chips on Tasks (44px).
- Token-based colour system in `globals.css` (S2 and chart hex values are the exceptions).
- `env(safe-area-inset-bottom)` on the bar and sheets, once `viewport-fit=cover` is added.
- Inline editing, optimistic updates and undo toasts (see `docs/specs/optimistic-updates.md`).
- Skeleton `loading.tsx` files per route.
