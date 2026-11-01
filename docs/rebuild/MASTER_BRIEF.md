# Nest — master brief for a ground-up UI rebuild

Status: **decisions taken 2026-11-01 (section 11); ready to build.** Written 2026-11-01 from the code, `CONTEXT.md`, the ADRs and `docs/mobile/strategy.md`.
Items marked **[confirm]** were open questions; their resolution is in section 11.

## 0. How to use this brief

This describes **what Nest is and how it should behave**, not how the current screens happen to look. It deliberately leaves out the accumulated visual tweaks. A fresh build should follow it top to bottom: foundations first (section 5), then one page at a time (section 7).

**Scope of the rebuild: the UI layer only.** Everything under "Keep as is" (section 2) stays. The new UI talks to the same tRPC routers.

Vocabulary is fixed by `CONTEXT.md` (Household, Member, Module, Shared/Personal, Visibility, Recurring item, Left each month, …). Use those words in the UI and in code. Do not rename them.

## 1. Product

**One-liner.** A single environment for everything a household needs to run its shared life: money, chores, lists, important records. Built for a couple living together; modules can be switched off so other setups (a flatshare) show only what fits.

**Users.** Members of one Household (usually two). Mostly on a phone (installed PWA on iPhone is the main case), sometimes on a laptop for money work (CSV import, budgeting).

**Principles that decide ambiguous cases**
1. **One job per screen, answered in the first viewport.** Dashboard: "what needs me today?". Shopping: tick things off. Transactions: "what did we spend, and is it categorised?".
2. **Shared vs Personal is always visible.** A Member must never wonder whose money or item they are looking at, or whether the partner can see it.
3. **Numbers that people plan with only move when they say so** (ADR 0004).
4. **Undo over confirm** for reversible actions; confirm only for irreversible ones (delete vault entry, remove all transactions, delete account).
5. **Gestures are shortcuts, never the only path.**
6. **No data loss, no silent drops.** Imports report what they skipped and why.

## 2. Keep as is (do not rebuild)

| Layer | What | Why keep |
|---|---|---|
| Data | `prisma/schema.prisma`, migrations, Neon (Frankfurt), `src/lib/prisma.ts` | Hard-won; EU move done |
| API | `src/server/api/**` (tRPC routers, `trpc.ts`, `net-worth.ts`, `recurring-match.ts`) | All business rules live here |
| Auth | Better Auth, `src/lib/auth.ts`, `src/app/api/auth`, `proxy.ts` | ADR 0007; live cutover done |
| Vault crypto/storage | `src/server/vault-*.ts`, `/api/vault/attachments` | ADR 0001, 0008 |
| Push + cron | `src/server/push.ts`, `reminder-digest.ts`, `/api/cron/reminders`, `vercel.json` | ADR 0002 |
| Pure domain logic | `src/lib/*` (csv, statement-import, categorize, recurring*, budget-*, schedule, money, format, vault, modules) | Framework-free, tested by real data |
| Demo | `src/server/demo`, `scripts/demo-reset.ts`, `DEMO_MODE` | ADR 0005; every schema change also goes to the Demo DB (`npm run demo:migrate`) |
| tRPC client + optimistic helpers | `src/trpc/**` | See `docs/specs/optimistic-updates.md` |

Audit step before building: confirm which `src/components/*/use-*.ts` hooks are pure data hooks (keep) vs. UI (rewrite). The hooks wrapping tRPC with optimistic updates (`use-transactions`, `use-shopping`, `use-tasks`, `use-reminders`, `use-vault`, `use-wishlist`, `use-recurring`, `use-accounts`, `use-categories`) are expected to stay.

## 3. Domain in brief

Everything belongs to exactly one **Household**. Details are in `CONTEXT.md`; this is the minimum a designer needs.

- **Ownership.** Each item is **Shared** (owner null: any Member edits, counts toward combined totals) or **Personal** (one owner edits; never in combined totals). **Visibility** lets the household see a Personal item read-only; it never grants edit. Shopping lists are Shared or Private (no read-only middle). Wishes follow their own claim rules.
- **Modules** (switchable per household, data kept when off): Finance, Tasks, Shopping list, Wishlist, Vault. Navigation and Dashboard must re-flow when modules are off.
- **Finance**
  - Financial accounts (checking, savings, credit card, cash, investment, loan, mortgage); balance is derived from `startingBalance` + transactions. Liabilities store a positive "amount owed".
  - Transactions (expense / income / transfer), Categories (household list, colour each), CSV/statement import with auto-detected columns and per-row category suggestion; import is idempotent.
  - Recurring items (income, expense, transfer) with Budget groups, a Basis and a **Budgeted amount** that only changes on approval. **Left each month** per scope (You / Household / a partner's visible accounts); only checking, cash and credit card count.
  - Category Budgets (monthly spend limit per category; status good <90%, warn 90–100%, critical >100%).
  - Net worth = Shared accounts only. History chart from snapshots.
- **Tasks.** Todos (title, priority, assignee, done). Reminders on a Schedule (every N days/weeks/months/years; from-done or fixed), assigned to a Member or Everyone; ticking records a Completion. One daily web-push digest (ADR 0002).
- **Lists.** Shopping lists with items (name, amount, tick → strike → disappears after a few seconds, undo), Favorites per list. Wishlist per Member plus shared "Home"; Claims hidden from the wish's owner.
- **Vault.** Entries with title, Vault category, expiry date, Fields (text / date / secret), note, Attachments (PDF/image, ≤4 MB, ≤10), pinned. Templates prefill. Secrets hidden until revealed.

## 4. Information architecture

```
/dashboard                     Home: summary line + cards
/finance/budgets               Recurring items, Left each month, suggestions
/finance/transactions          List, filters, import
/finance/accounts              Account list
/finance/accounts/[id]         One account: balance chart + its transactions
/tasks/todos
/tasks/reminders
/lists/shopping
/lists/wishlist
/vault  /vault/new  /vault/[id]
/settings/profile | categories | household | notifications | data
/signin /signup /verify-email /forgot-password /reset-password
/household-setup               First sign-in: create or join
```

- **Desktop (≥768):** left sidebar (Dashboard, Finance, Tasks, Lists, Vault + profile/settings link), content in one panel.
- **Phone:** sticky top bar with burger → left drawer listing every destination, settings pages and sign out. (A bottom bar was tried on paper and rejected because it fights the browser's own controls.)
- **Section pages use tabs** (Finance: Budgets / Transactions / Accounts / Category budgets; Tasks; Lists). **Settings on phone is a drill-down list** (row → sub-page with back); desktop keeps tabs.
- Module-gated: a page of a switched-off module shows a gate message, not an error.

## 5. Design system and foundations (build this first)

### 5.1 Stack

- Next.js (App Router) as today. **Read `node_modules/next/dist/docs/` first**: this Next version differs from what you remember (AGENTS.md).
- Tailwind v4 + **shadcn/ui** as the component layer, **on top of Base UI primitives** (shadcn supports Base UI; ADR 0006 chose Base UI for behaviour). Decided: Base UI variant of shadcn, not Radix.
- This supersedes ADR 0006's "the look stays in the app's own classes": the shadcn components become the look, and ADR 0006 gets a new ADR that replaces it.
- Components are copied into `src/components/ui/` and owned by us. **Rule: pages never style a primitive from scratch.** If a page needs a new variant, it goes into the primitive.

### 5.2 Tokens (one source of truth)

Use shadcn's token names (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--primary`, `--destructive`, `--ring`, `--radius`) mapped to the Nest look:

- **Look.** Light theme only (dark mode out of scope; keep tokens dark-ready). Monochrome near-black / white / grey; **colour is reserved for status** (good green, warn amber, critical red) and category dots. Black pill primary buttons. Thin 1px borders, almost no shadows (shadows only for sheets and the floating phone action).
- **Type.** Sans for UI; a display face only for page titles and big numbers. Scale: caption 12 (floor), meta 13, secondary 14, body 16, heading 18, title 24. **Inputs are always 16px** (iOS zoom). Money uses tabular numerals.
- **Spacing.** 4px base. Gutter 16px phone / 40px desktop. Section gap 24px phone / 32px desktop.
- **Targets.** 44px minimum hit area (48px primary). Visual size may be smaller if the hit area is 44px.
- **Contrast.** AA for all text, including muted text on the grey shell. Muted and faint text tokens must pass; do not use a grey lighter than ~`#6e6e78` for text.
- **Formatting.** EUR, en-GB (`€1,234.56`, `25/09/2026`). Household clock is `Europe/Amsterdam`; dates are date-only (UTC midnight).

### 5.3 Layout primitives (the part that was missing)

Build these once and use them on every page, so desktop and phone are designed together:

| Primitive | Job |
|---|---|
| `AppShell` | Sidebar (desktop) / top bar + drawer (phone); safe-area aware; `dvh`, never `vh` |
| `PageHeader` | Title, optional subtitle, primary action slot. Phone: sticky bar; primary action floats in the thumb zone |
| `SectionTabs` | Tabs on desktop, scrollable/segmented on phone |
| `PageBody` | Applies the page rules below |
| `RowList` / `Row` | The list grammar below, one component for every list in the app |
| `Sheet` (drawer) | Bottom sheet on phone, centred dialog or side panel on desktop; same content component |
| `Field` / `AmountInput` / `DateInput` / `ChoiceChips` | Forms; label above, inline error, correct `inputMode`/`autocomplete`/`enterKeyHint` |
| `EmptyState`, `Skeleton`, `Toast` (with Undo), `ConfirmDialog` | States |
| `AmountText`, `OwnerBadge`, `CategoryDot`, `Avatar` (decorative when beside a name) | Domain atoms |

### 5.4 Page layout rules (from AGENTS.md; non-negotiable)

- A page **opens with an unboxed element** (key figure, filters or intro).
- **Boxes are for collections of rows, not sections.**
- Gap between tab bar and content: **24px phone, 32px desktop.**
- **On phones, row lists have no outer box.**

### 5.5 Row grammar

Leading control (check / avatar / category dot) → content (title + one meta line) → trailing value or chevron. Title and amount are never truncated by secondary chrome. Anything else moves to the detail sheet or a "⋯" menu. Whole row is the tap target; tap opens the detail sheet. Row actions that exist as a swipe also exist as a visible button or in the sheet.

### 5.6 Responsive rule

Mobile-first. Base styles are the phone; `md` (768) adds sidebar and tables; `lg` adds width. **No desktop-down overrides.** Every page is checked at 320, 390, 768 and 1280 before it counts as done. Tables exist only at `md+`; below, the same data renders as a list (render one, not both).

### 5.7 Interaction rules

- Add flows: inline add row where the list is the context (shopping, todos); sheet where there are 3+ fields (transaction, account, vault entry, recurring item).
- Optimistic updates with rollback and an Undo toast; pressed (`:active`) feedback on every tappable element; skeletons that match final row heights (no layout shift).
- Focus: opening a sheet moves focus into it (to the sheet, not a field, when opened by touch so the keyboard stays closed); closing returns focus to the opener; Escape closes.
- Reduced motion respected. Motion 150–250 ms ease-out.
- Reorder (budget rows) only in an explicit mode with dnd-kit `TouchSensor` (200 ms delay), never in the scroll path.

## 6. Cross-cutting requirements

**Accessibility (WCAG 2.2 AA).** One `<h1>` per page and a unique page `<title>`; `main` landmark on every screen including auth; `aria-current` on active nav; every icon button named; errors linked to fields; live region for toasts; decorative avatars hidden; expiry dates readable as text; no information by colour alone; targets 44px. Gate with the existing `accesslint`-style scan plus keyboard pass.

**Performance.** Server-prefetch the first view of data-heavy pages (Budgets, Transactions, Accounts, Tasks, Vault) and hydrate React Query; server-render the phone layout on phones; lazy-load charts, dnd-kit, CSV import, date picker and papaparse; keep the data layer off the first load. Targets on throttled mid-tier mobile: LCP < 2.5 s, INP < 200 ms, CLS < 0.05; Transactions first paint under ~150 interactive elements (page by 50).

**PWA.** Installable, standalone, `viewport-fit=cover`, safe-area on bars and sheets, 16px inputs, `touch-action: manipulation`. No offline mode (decided: out).

**Privacy and security.** Visibility rules are enforced server-side (already). The UI never shows another Member's Personal item as editable, and never exposes Claims to the wish's owner. Secrets are masked by default; reveal needs a deliberate tap and keeps focus.

**Demo.** A "made-up data" badge, one-click sign-in as either of two people, no Google sign-in, no push settings. Keep working.

**Tests.** Keep `tests/mobile/audit.mjs` as a gate (no overflow at 320–768, no input <16px, no target <44px outside an allowlist) and `tests/visual` for before/after comparison.

## 7. Screens

For each: job, content, key states, and what is hard. Order of build follows section 9.

### 7.1 Auth and setup
Sign in (email+password, Google), sign up (must verify email), verify-email, forgot/reset password, household setup (create or join with invite code). Correct `autocomplete` values; email-app deep link on verify. Auth screens have a `main` landmark and a page title.

### 7.2 Dashboard
Job: what needs me today. Unboxed **summary line** of counts, each a link ("2 reminders due · 3 open tasks · 1 item expiring · 5 items to buy"; parts at zero omitted; "Nothing due today." if none). Then, per enabled module: **missing statements** reminder (upload last month's bank statement), **Shopping card** (inline add, tick), **Tasks snapshot** (my + everyone's due/overdue, expiring vault entries). First run with Finance on and no accounts: a short **onboarding wizard** (create first account, optionally first transaction). Net worth lives in Finance, not here (decided).

### 7.3 Finance → Budgets (the core page; most complex)
Job: "how much is left each month, and what are our fixed items?".
- Opens with the **Left each month** key figure (unboxed), with a scope switch: You / Household / each partner whose items are visible. Income minus expenses; counts only checking/cash/credit-card accounts; a recurring transfer into savings counts as an expense on the source account.
- **Account cards** strip (balances, Shared vs Personal clearly marked).
- **Suggestions**: detected recurring items awaiting confirmation (owner-only). One entry point ("Review suggestions") opening a sheet; add / dismiss, never reappear once decided.
- **Recurring items** in two parts, Income and Expenses; expenses grouped by **Budget group** (Rent, Insurances, Savings…, "Other"), groups collapsible, creatable, renamable, reorderable; items reorderable inside and across groups (reorder mode). With more than one Member, items are also grouped by owner (Shared / each Member); a solo household sees the flat layout.
- **Row**: name, monthly-equivalent amount, meta (account · schedule). Varying amounts shown as such. A proposed new Budgeted amount shows **Update / Keep** on the row (ADR 0004; changes <3% or €1 ignored). Detail sheet: Payments history (set a one-off Payment aside), Basis (Latest / Lowest / Highest / Average of last 6 / Fixed), schedule (every N units), account, destination account for transfers, category, group, Visibility.
- **Category budgets** (monthly limits with status bars, "Budgets · {month}") get their own Finance tab, not a section on this page (decided).
- Edge cases: yearly items cannot be detected (<2 years of data), added by hand; mutate only Shared or own items (404 otherwise); Personal items of a partner are visible only if they allow it (Settings → Privacy toggle `shareRecurringItems`). The toggle was not found in the current settings pages; verify before building, and add it to Settings → Profile if missing.

### 7.4 Finance → Transactions
Job: what did we spend, and is it categorised.
- Phone: list grouped by date (Today, Yesterday, "Mon 12 Oct"), row = category dot + merchant (+ account · category) and signed amount right-aligned. Desktop: table. Pages of 50.
- One **Filters** control with active-count badge → filter sheet (account, category, type, period, search); active filters as dismissible chips.
- **Detail sheet**: category (chips), note, mark as recurring, delete. Category edit "apply to all from same merchant".
- **Add** (amount first; expense / income / transfer) and **Import** (CSV/statement): column auto-detect, per-row category suggestion with a live "N categorised automatically" count, count of rows excluded and why, never drop a row for a missing description, idempotent re-import, Transfer detection by the account's own IBAN. **Remove all** with an explicit confirm.
- Uncategorised queue for bulk work after import.

### 7.5 Finance → Accounts and account detail
Account cards grouped Shared / Personal (owner picker only when >1 Member); type, balance, starting balance editable. Account detail: balance, `BalanceChart` (presets 1M/3M/6M/1Y + custom range + Day/Week/Month granularity, touch-scrub tooltip, text summary for screen readers), that account's transactions (a transfer reads "to X" / "from Y" from this account's side). Net worth chart (Shared only) uses the same component. "Today" in the chart is computed from UTC components.

### 7.6 Tasks
- **Todos**: checklist, open sorted by Priority (High first), assignee, add inline, edit in sheet, done list.
- **Reminders**: grouped by due bucket (overdue / today / upcoming), whole-row tick records a Completion with Undo, assignee (Member or Everyone), Schedule picker (N × day/week/month/year, from-done vs fixed), completion history.
- Notifications settings: opt in per device (iPhone needs the installed app); one digest per day.

### 7.7 Lists
- **Shopping**: list switcher (Shared default "Groceries", Private lists), inline add, tick = strike → fade → gone (undo during grace), "In basket" state, **Favorites** one-tap re-add, quantity as free text.
- **Wishlist**: tabs per Member + shared "Home"; wish = title, optional link, price, note; Claim (hidden from owner; visible on Home wishes); "Received" archives it; per-Member visibility toggle.

### 7.8 Vault
List grouped/filterable by Vault category, pinned on top, expiry shown as readable text with status. New entry from a Template (Passport, Driver's licence, Insurance, Warranty, Invoice, Tax return, Bank account, Blank). Entry detail: Fields (Secrets masked, reveal keeps focus, copy buttons named), expiry, note, Attachments (upload with client-side image shrink, 4 MB cap), Shared/Personal + Visibility, delete with confirm. Category manager (rename, reorder, delete; "Other" fallback cannot be deleted).

### 7.9 Settings
Profile (name, avatar, password), Categories (Finance categories with colour), Household (name, Members, invite code with regenerate, **Modules on/off**), Notifications, Data (export; Remove all lives with Transactions).

## 8. Known gotchas worth keeping from the current build

- Date-only values travel as UTC midnight; never compare against local midnight.
- Balances and net worth are recomputed from `startingBalance` on every transaction mutation; the UI never edits `balance`.
- Money inputs are plain text inputs with `inputMode="decimal"`, not number steppers.
- Date pickers are lazy-loaded; file inputs and the vault note stay native.
- Base UI on iOS 26 Safari needs `body { position: relative }`; page content sits in its own stacking context so portalled pop-ups stay on top.
- Postgres unique indexes treat NULL as distinct; hence the `ownerScope` sentinel on Budgets.
- Prisma is pinned to 6; do not upgrade to 7.
- `next dev` rewrites the AGENTS.md block; commit it with your work.

## 9. Build order

Each step is a branch/PR that ships on its own and is checked at 320 / 390 / 768 / 1280 plus the audit gate.

1. **Foundations.** shadcn init (Base UI), tokens, type, `AppShell`, `PageHeader`, `SectionTabs`, `Sheet`, `Row`/`RowList`, form fields, states. A single `/dev/kitchen-sink` page proves each at four widths.
2. **Auth + setup + Settings** (low risk, exercises forms and Sheet).
3. **Lists + Tasks** (simplest data; proves Row, inline add, swipe/undo).
4. **Vault.**
5. **Finance: Accounts → Transactions → Budgets** (hardest last; reuses everything).
6. **Dashboard** (composes the cards).
7. **Cutover:** delete old components, replace ADR 0006, update `docs/mobile/strategy.md`, run Demo reset and full audit.

**Decision gate after step 3:** compare the rebuilt Tasks/Lists against the current ones on build speed and phone/desktop quality. If it is not clearly better, stop and keep the current UI; steps 1–3 cost one branch.

## 10. Definition of done (per page)

- Follows the page layout rules (5.4) and row grammar (5.5); no custom-styled primitives.
- No overflow at 320; no input <16px; no target <44px; AA contrast; keyboard path for every action.
- Loading, empty, error and offline-failed-mutation states exist and match final layout.
- First view server-prefetched where listed; heavy libs lazy-loaded.
- Works with its Module off, as Personal vs Shared, and with a solo household.
- Verified in the Demo environment with seeded data.

## 11. Decisions

1. Component layer: shadcn on Base UI (not Radix).
2. Settings on phone: drill-down list; tabs on desktop.
3. Net worth: stays in Finance, not on the Dashboard.
4. Category budgets: own tab under Finance.
5. `shareRecurringItems` toggle: unverified in the UI. Check code in step 5; add to Settings → Profile if missing.
6. Brand (Nest mark, display font): unchanged.
7. Dark mode: out of scope; tokens stay dark-ready.
8. Rebuild on a branch of this repo, sharing the backend.
