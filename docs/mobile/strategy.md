# Mobile strategy (draft for sign-off)

Status: **proposal, nothing implemented yet.** Based on [audit.md](./audit.md).

## 1. Diagnosis in one paragraph

Nest's mobile layer is a desktop layout that stacks and truncates. The shell, tokens, bottom-sheet modal and
sign-in screens are fine. What fails is **density and structure**: tables that hide the amount, rows that fight
for width among 3–5 controls, 16px icon buttons next to destructive actions, 13px inputs that make iOS zoom, and a
six-item bottom bar. Fixing this with more breakpoints would give a smaller version of the desktop. The plan is to
design each screen for one hand and one job first, then let the desktop layout grow from it.

## 2. Principles

1. **One job per screen, answered in the first viewport.** Dashboard: "what needs me today?". Shopping: "tick things off". Transactions: "what did we spend, and is it categorised?".
2. **Thumb zone first.** Primary actions live in the bottom third (sticky bar or FAB). Destructive actions never sit next to frequent ones.
3. **44px hit area, whatever the visual size** (48px for primary). A 20px icon can stay if its tappable area is 44px.
4. **Rows have a fixed grammar:** leading control (check/avatar), content (title + one meta line), trailing value or chevron. Everything else moves to a detail sheet or a swipe action.
5. **Progressive disclosure over truncation.** Title and amount are never truncated by secondary chrome. Secondary data goes to the meta line or the detail sheet.
6. **Undo over confirm** for reversible actions (the app already has undo toasts); confirm only for irreversible ones (vault delete, "Remove all").
7. **No hover-only information.** Tooltips become visible text or detail-sheet content on touch.
8. **Desktop is not regressed.** Mobile-first base styles, `md:`/`lg:` enhancements; 768 and 1280 are checked after every step.

## 3. UX strategy

### 3.1 Information architecture and navigation

- **Bottom bar: 4 destinations + "More".** Proposed: **Home, Money, Tasks, Lists, More**. That is 5 slots (nav rule: max 5), each at least 64px wide at 320px.
  - "Vault" and "Settings" move under More (a real overflow screen listing Vault, Settings, Household, Notifications, Data, Sign out). Vault is low-frequency and sensitive, so one extra tap is acceptable.
  - Modules that a Household switches off disappear from the bar; the bar re-flows (`use-modules`). With fewer than four modules, "More" still exists, so the bar is never one item.
  - *Open question for you:* is Vault used often enough to deserve a slot? See questions below.
- Labels 11–12px minimum, active state = filled icon + label colour + a small indicator pill (not colour alone).
- Within a module, replace the horizontal `TabBar` with a **segmented control** (Finance: Budgets / Transactions / Accounts; Lists: Shopping / Wishlist) that fits the width without scrolling. Settings becomes a drill-down list (row → sub-page with a back button).
- Header: a compact sticky top bar with page title (and back where relevant) replaces the tall greeting block; the greeting stays on Home only, smaller.

### 3.2 Top jobs and target path (≤2 taps from the home tab)

| Job | Today | Target |
|---|---|---|
| Add a shopping item | Lists → Shopping → add row | Home card inline add (1 tap + type), or Lists tab opens straight on the default list |
| Tick an item while shopping | tiny checkbox | Whole row is the tap target; strike-and-fade already exists |
| Mark a chore done | 24px checkbox | Whole-row leading check with 44px area, undo toast |
| Add a transaction | Finance → Transactions → "+ Transaction" at top | Money tab: sticky "+" action in the thumb zone, sheet with amount-first form |
| Categorise a transaction | tap tiny category chip in table | Tap row → detail sheet with category chips, or swipe action |
| Check balances / net worth | Home | Home, unchanged but compact |
| Open a vault entry | Vault tab | More → Vault (2 taps), reveal button 44px |

### 3.3 Interaction patterns

- **Bottom sheets** replace centred modals and popover menus on touch: forms, filters, row details, pickers (assignee, priority, schedule, account, category). One `BottomSheet` primitive, built on the existing Base UI `Dialog` so focus and a11y behaviour carry over (ADR 0006). Adds drag handle, swipe-down to dismiss, `dvh` height, safe-area padding, and `visualViewport` awareness so the primary button stays above the keyboard.
- **Swipe actions on rows** (complete, delete, edit) with a **visible non-gesture fallback** (the detail sheet or an overflow "⋯" button). Gestures are a shortcut, never the only path (a11y). Destructive swipe requires a full swipe or reveals a button; vault entries never delete by swipe.
- **Reorder** (budget rows, lists): a dedicated "Reorder" mode with large handles and dnd-kit `TouchSensor` (press-delay 200ms, tolerance 8px) so scrolling is not hijacked. Never always-on reorder in the scroll path.
- **Add flows:** inline add rows where the list is the context (shopping, todos); full-screen/sheet forms where there are 3+ fields (transaction, account, vault entry).
- **Pull to refresh:** only where data can go stale while the app is open (Home, Shopping, Tasks), via React Query refetch; styled with `overscroll-behavior` instead of a library.
- **Optimistic updates + undo** remain the default (see `docs/specs/optimistic-updates.md`).

### 3.4 Dense data

- **Transactions:** replace the table below `md` with a **grouped list by date** (sticky date headers: "Today", "Yesterday", "Mon 12 Oct"). Row = category colour dot + merchant (+ one meta line: account · category) on the left, signed amount (tabular numerals, right-aligned, never truncated) on the right. Tap → detail sheet (category, recurring toggle, notes, delete). Remove the per-row inline category dropdown on phones.
  - **Filters:** a single "Filters" button with an active-count badge opens a filter sheet; search sits in a sticky field; active filters show as dismissible chips.
  - **Volume:** page by 50 with infinite scroll (IntersectionObserver) or windowing; target under 150 interactive elements on first paint, down from ~570.
  - **Bulk categorisation** (an import use case) gets a dedicated "Uncategorised" queue: one card at a time with category chips, rather than 200 dropdowns.
  - Desktop keeps the table.
- **Budgets:** row = bar/colour + name + amount with a progress line; "next date", visibility, history and edit move to the detail sheet. Group headers collapse. The recurring-detection card becomes a dismissible "Review suggestions" entry that opens a sheet. Fixes B1/B2 at the root.
- **Accounts:** card list: name, type, balance; tap → account detail; actions in the sheet, not the row.
- **Charts** (`balance-chart.tsx`): full width, touch-scrub tooltip showing the value under the finger, 44px range chips (1M / 6M / 1Y), a text summary below the chart for screen readers.

### 3.5 Forms

Single column; each field full width, 48px tall, 16px text; label above; correct `type`, `inputMode` (decimal for amounts), `autocomplete`, `enterKeyHint`; amount first in the transaction form with the right keyboard; inline validation; sticky submit above the keyboard; draft preserved if the sheet is dismissed accidentally; date inputs use native pickers.

### 3.6 States

- **Loading:** keep skeletons; make them match the new row heights so there is no layout shift.
- **Empty:** every list gets one sentence and one primary action ("Add your first item").
- **Error/offline:** a non-blocking banner ("Offline. Changes will sync") and queueing for the highest-value writes (shopping tick/add, task done); the service worker gains an app-shell cache for the last-viewed routes (read-only), in a separate, small step. *Scope decision below.*
- **Pressed:** every tappable element gets an `:active` state (≈100ms) so touch feels responsive.

### 3.7 Auth and onboarding

Sign-in/up already work. Add proper `autocomplete` (`username`, `current-password`, `new-password`, `one-time-code`), `enterKeyHint`, and an email-app deep link on the verify-email page. The onboarding wizard is reviewed in the dashboard step.

## 4. UI system

Tokens in `globals.css` / Tailwind `@theme`; everything below is one place to change.

| Area | Decision |
|---|---|
| Type scale (mobile) | Body 16 / 1.45 (inputs always 16), secondary 14, meta 13, caption 12 (floor), title 24, section heading 18. Currently many 12.5–13.5px values: floor of 12px, 13–14 only for meta. Amounts use tabular numerals. |
| Spacing | 4px base; screen gutter 16px (20px ≥ 430); row padding 12–16px; section gap 24px. |
| Touch targets | `--tap: 44px` token and a `tap-target` utility (pseudo-element expands hit area without changing visuals). Primary buttons 48px. Minimum 8px between adjacent targets. |
| Radius / elevation | Keep the current radii (rounded 24px panels); sheets 24px top; shadows only for sheets and the sticky action; borders elsewhere. |
| Colour | Keep the monochrome + status palette. Add `--surface-pressed`; verify muted/faint text meets AA on the grey shell (the faint grey `#a1a1aa` on white is ≈2.6:1: fails for text; use only for decorative or raise to `#71717a`). Replace hard-coded rgba/hex in the shell and chart with tokens. |
| Icons | 20–24px visual, 44px hit area. |
| Motion | 150–250ms ease-out for sheets and row feedback; sheet spring ≤300ms; all gated by `prefers-reduced-motion`. |
| Dark mode | Out of scope here; the token structure keeps it open. |

**Component set (new or reworked):** `BottomSheet` (from `Modal`), `ActionSheet` / `Picker` (from popover-menu and `Select` on touch), `ListRow` (grammar above) with `SwipeActions`, `StickyActionBar` / `Fab`, `SegmentedControl` (from `TabBar`), `FilterSheet`, `EmptyState`, `Stepper` (reworked `quantity-stepper`), `DateGroupHeader`, `AmountText`. Each lands with the first screen that needs it, not up front.

**Breakpoints:** base = phone; `sm` (≥640): sheets become centred modals; `md` (≥768): sidebar replaces the bottom bar, tables return; `lg`: wider content. No desktop-down overrides.

## 5. Technical strategy

- **Shell and PWA:** add `viewport-fit=cover`, `interactive-widget=resizes-content`, `themeColor` per scheme; switch `min-h-screen` to `min-h-dvh`; `overscroll-behavior-y: contain` on sheets; `touch-action: manipulation` globally (removes the 300ms double-tap delay); tap highlight off; safe-area on bar, sheets and sticky actions. Check the manifest for `display: standalone`, `orientation: portrait`, shortcuts (Add shopping item, Add transaction).
- **Performance budgets (throttled mid-tier mobile, 4G):** LCP < 2.5s, INP < 200ms, CLS < 0.05, route JS < 170KB gz where feasible. Server components for data-heavy shells; `next/dynamic` for charts, dnd-kit, CSV import, sheets that are not shown on first paint; split `budgets/page.tsx` (1,091 lines) and `transactions/page.tsx` (939 lines) by view.
- **Accessibility:** focus trap and return in sheets (Base UI provides this), 44px targets, visible focus, labels on every icon button (they exist; keep them), `aria-live` for undo toasts, no gesture-only paths, respects text zoom (rem), and contrast AA.
- **Testing:** extend `tests/mobile/audit.mjs` into a regression gate: fail on page overflow at 320, any text input < 16px, any interactive target < 44px (with an allowlist file), and screenshot diff at 360/390/430 via the existing pixelmatch setup. Real-device pass on at least one iPhone (Safari and installed PWA) and one Android Chrome before calling a module done.
- **Rollout flags:** none needed; each step is shippable. The sidebar/desktop paths stay untouched.

## 6. Phased plan

Each phase is one branch/PR and leaves the app shippable. Desktop (768 / 1280) is re-checked each time.

| Phase | Scope | Why this order | Exit check |
|---|---|---|---|
| **0 Foundations** | Viewport/safe-area/`dvh`, `touch-action`, `--tap` token + utility, type scale tokens, 16px inputs everywhere, `:active` states, `BottomSheet` + `SegmentedControl` primitives, audit script as a gate | Cheap, global, unblocks everything; fixes E1, S3, S4, S7 | No input <16px; no new overflow; desktop screenshots unchanged |
| **1 Shell and navigation** | 5-slot bottom bar, real More screen, compact top bar, sticky action slot (replaces `PageActions` on phones) | Every screen sits in it; fixes S1, S2, S5, S6, E3 | Bar fits at 320; every tab ≥ 44px |
| **2 Lists and Tasks** | Row grammar, 44px hit areas, swipe + fallback, task detail sheet, action sheets for assignee/priority/schedule, shopping one-handed pass | Highest-frequency, simplest data; proves the row and sheet patterns | Tick an item with one thumb at 360px; K1–K4, L1–L2, D1–D2 closed |
| **3 Finance** | Transactions list + filter sheet + detail sheet + paging; budgets row redesign + reorder mode; accounts cards; chart touch | Biggest value and biggest effort; benefits from the proven patterns | T1–T6, B1–B3, A1–A2 closed; first paint under 150 interactive elements |
| **4 Vault, Settings, Auth, Onboarding** | Vault row and 44px reveal/edit with safe delete; settings drill-down; auth attributes; onboarding wizard | Lower frequency | V1, V2, E1–E3, U1 closed |
| **5 Resilience and polish** | Offline banner + queued writes (if approved), error states, empty states, motion pass, Lighthouse and real-device pass | Needs the settled UI | Lighthouse mobile ≥ 90 perf, ≥ 95 a11y; device pass notes |

## 7. Risks and trade-offs

- **Two row layouts (mobile list vs. desktop table) on transactions** means maintaining two presentations of the same data. Mitigation: share one data hook and a row view-model; render the table only at `md+` (do not render both).
- **Swipe gestures** are discoverable only with a hint; keep the fallback and show a one-time coachmark.
- **Offline queueing** is a real feature with conflict rules (two members editing). Treat as optional Phase 5, not an assumption.
- **Moving Vault to "More"** adds a tap for a sensitive but low-frequency module. Revisit with usage in mind.
- **Scope of testing:** only emulation and one device. iOS standalone quirks may still surface after release.
- **No schema, tRPC or auth changes** are planned. If paging transactions needs a cursor change in the API, that will be raised first (the demo DB must also get any schema change).

## 8. Decisions I need from you

1. **Bottom bar:** Home / Money / Tasks / Lists / More (Vault under More): OK, or does Vault deserve a slot?
2. **Transactions on phones:** grouped list + detail sheet (no inline category dropdown on phones). OK?
3. **Offline:** include read-only caching and queued writes in Phase 5, or skip?
4. **Test devices:** which phone do you use (iPhone model / Android), and do you use the installed PWA or Safari/Chrome?
5. **Dark mode:** confirm it stays out of scope.
6. **Gesture appetite:** are swipe actions welcome, or keep everything tap-based?

On approval I start Phase 0 and report after each phase.

---

## Implementation status (2026-10-17)

Branch `mobile/phase-0-foundations`. Decisions taken along the way:

- **Navigation is a burger menu with a left drawer**, not a bottom bar (a bottom bar fights the mobile browser's own controls). The drawer lists every destination, the settings pages and sign-out. Supersedes section 3.1 and the "More" screen.
- **Finance keeps its name** (CONTEXT.md) instead of "Money".
- Offline caching and queued writes are **not** done (skipped by decision); dark mode stays out of scope.

| Phase | State |
|---|---|
| 0 Foundations | Done: viewport/safe area/dvh, tap-target and 16px-input rules, sheet with swipe-dismiss, segmented tabs, audit gate |
| 1 Shell | Done: burger drawer, sticky title bar, floating page actions |
| 2 Lists and Tasks | Done: row sheets, 44px targets, 12px text floor |
| 3 Finance | Done: grouped transaction list + filter/detail sheets + 50-row paging, budget/account rows with sheets, group rows |
| 4 Vault, Settings, Auth, Onboarding | Done: Vault reveal/⋯ sheet, 44px settings controls, auth autocomplete/enterKeyHint, onboarding sizes |
| 5 Resilience and polish | Open: chart touch scrub, empty/error states, motion pass, Lighthouse and real-device pass |

Measured with `tests/mobile/audit.mjs` at 390px: small tap targets went from ~1,100 (567 on Transactions alone) to 12; sub-12px text from ~330 to ~3; no horizontal overflow at 320-768 (`baseline.json` `knownOverflow` is empty).
