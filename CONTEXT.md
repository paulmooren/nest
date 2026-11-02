# Nest

A single environment for everything a household needs to run its shared life — money, chores, and (soon) lists and records — built for a couple living together.

## Language

### People

**Household**:
The group of people who share one Nest environment. Everything in the app belongs to exactly one Household.
_Avoid_: Family, team, workspace

**Member**:
A person belonging to a Household.
_Avoid_: User (except for the login identity), partner

**Module**:
A self-contained area of the app (Finance, Tasks, Shopping list, …) that a Household can switch on or off. Today's setup is a couple; Modules exist so other setups, such as a flatshare, can show only what fits them.
_Avoid_: Feature, section, plugin

### Ownership and visibility

**Shared**:
Belongs to the Household as a whole; any Member may edit it, and it counts toward combined totals. Also called "joint".
_Avoid_: Public, common

**Personal**:
Owned by one Member; only that Member may edit it, and it never counts toward combined totals.
_Avoid_: Private (that describes hidden Visibility, or a Private Shopping list — not ownership), own

**Visibility**:
Whether the rest of the Household can see a Personal item, read-only. Shared items have no Visibility setting — they are always visible. Visibility never grants edit rights.
_Avoid_: Sharing, privacy setting

### Finance

**Financial account**:
A bank, savings, cash, credit, investment or loan account whose balance and transactions are tracked. Distinct from a login identity.
_Avoid_: Account (alone, ambiguous with login)

**Recurring item**:
A confirmed income, expense or transfer that comes back on a Schedule, linked to a Financial account and remembering how to recognise its transactions (the other party, or its description with the changing numbers stripped out).
_Avoid_: Subscription, standing order, budget item

**Category**:
The kind of spending or income something is — Groceries, Dining, Housing & Utilities. A Household has one list of them, used by transactions, category budgets and Recurring items.
_Avoid_: Tag, label

**Budget group**:
A named section of the recurring expenses that says what the money is for — Rent, Insurances, Savings, Shared Money. The Household has one list of them, created and renamed as it likes. An expense is in one Budget group or none (shown as "Other"); a group never holds income. Not a Category, which says what was bought.
_Avoid_: Category (that is the kind of spending), folder, bucket, section

**Payment**:
One transaction that is an occurrence of a Recurring item — one month's salary, one month's rent. A Payment that was a one-off (a bonus, a refund) can be set aside: it stays an ordinary transaction but no longer belongs to the item or its history.
_Avoid_: Occurrence, instance

**Budgeted amount**:
The figure a Recurring item contributes to Left each month. It is chosen by the Member from the item's Payments and never changes on its own: when new Payments suggest a different figure, the Member is asked to approve it.
_Avoid_: Amount (alone — ambiguous with what a single Payment was), expected amount

**Basis**:
The rule that turns a Recurring item's Payments into its Budgeted amount: Latest (the most recent Payment), Lowest, Highest or Average (each over the last 6 Payments), or Fixed (an amount the Member typed). Latest is the default.
_Avoid_: Strategy, mode, method

**Transfer**:
Money moved between two accounts the Household tracks. It is neither income nor spending, so it never counts toward budgets — unless it is recurring: then it counts as an expense for the account it leaves and as income for the account it enters.
_Avoid_: Internal payment, own-account payment

**Left each month**:
Recurring income minus recurring expenses for one scope: You (your personal accounts together), Household (the shared accounts together) or a partner's accounts you can see. Only Checking, Cash and Credit card accounts count; items on Savings, Investment, Loan and Mortgage accounts stay listed but are left out, and a recurring transfer into such an account counts as an expense on the account it leaves. It deliberately ignores everyday spending such as groceries.
_Avoid_: Budget (alone), remaining, free cash

**Suggestion**:
A Recurring item the app has detected from transactions but the Member has not yet confirmed. Only ever shown to the owner.
_Avoid_: Detected item

**Net worth**:
Combined balance of Shared Financial accounts only; Personal accounts are shown separately and never leak into the Household figure.

### Shopping

**Shopping list**:
A named list of things to buy, either Shared (every Member sees and edits it) or Private (only its creator sees it). Unlike other Modules it has no read-only middle state. Each Household starts with a Shared list called "Groceries".
_Avoid_: Grocery list (that is only the default list's name), basket, Personal list

**Shopping item**:
One thing to buy on a Shopping list: a name and an amount. Ticking it strikes it through and removes it a few seconds later, leaving time to undo a mis-tap.
_Avoid_: Product, entry

**Favorite**:
A Shopping item remembered on one Shopping list, with an optional amount, so it can be added again in one tap. Favorites belong to a list, not to a Member.
_Avoid_: Staple, frequent item, template

### Wishlist

**Wishlist**:
The Wishes of one Member, or the Shared "Home" wishlist for things the whole Household wants.
_Avoid_: Gift list

**Wish**:
One thing a Member wants: a title with an optional link, price and note. Marked "Received" by its owner, it moves to the archive.
_Avoid_: Item, product

**Claim**:
A Member marking another Member's wish as theirs to buy. The wish's owner never sees Claims, so gifts stay a surprise. On a Shared wish, a Claim is visible to everyone.
_Avoid_: Reserve, bought, assign

### Tasks

**Todo**:
Something to do once: a title, a Priority and an assignee, with no date. Todos form a simple checklist. The Tasks area of the app holds Todos and Reminders.
_Avoid_: Task (that is the area, not the item), to-do, chore

**Priority**:
How urgent a Todo is: Low, Medium or High. Open Todos are listed highest first.
_Avoid_: Importance, urgency

**Reminder**:
Something that comes back on a Schedule — hoovering, watering the plants, worming the dog — assigned to one Member or to everyone. Ticking it off records a Completion and works out when it is next due. Not a Todo.
_Avoid_: Recurring task, chore

**Schedule**:
How often a Reminder comes back: every N days, weeks, months or years. It is counted either from when the Reminder was last done (flexible, the default) or on a fixed rhythm regardless of when it was done.
_Avoid_: Frequency, repeat, interval

**Completion**:
The record that a Reminder was done: when, and by which Member. Anyone in the Household may tick off a Reminder, not only its assignee.
_Avoid_: Check-in, log entry

**Notification**:
The one daily message a Member gets on their phone listing what is due for them today, with a single nudge once something is 2 days overdue. Overdue Reminders after that stay red in the app but do not notify again.
_Avoid_: Alert, ping

### Vault

**Vault**:
The Household's place for everything worth keeping for now or later: ID numbers, policy numbers, and documents such as invoices, tax returns and warranties.

**Entry**:
One thing kept in the Vault — a passport, a car insurance, a washing-machine warranty. It has a title, a Vault category, optional Fields and optional Attachments; it can hold either or both. Shared or Personal like anything else. There is no separate "number" and "document" kind.
_Avoid_: Item, record, document (a document is an Attachment on an Entry), secret

**Field**:
A labelled piece of information on an Entry. Text (shown plainly), Date (shown plainly; an Entry's main expiry is a Date), or Secret (hidden until revealed). Any Entry may have extra Fields beyond its Template's.
_Avoid_: Property, attribute

**Secret**:
A Field whose value stays hidden until the Member reveals it, e.g. a passport number.
_Avoid_: Password, private field

**Attachment**:
A file (PDF or image) stored on an Entry — the scan of a passport, the PDF of an invoice.
_Avoid_: Document, upload, file (alone)

**Vault category**:
A Household-owned label that groups Entries (ID, Insurance, Taxes, …). Members can rename, reorder and delete them. Distinct from a Finance Category.
_Avoid_: Folder, tag, type

**Template**:
A built-in starting shape for a new Entry (Passport, Driver's licence, Insurance policy, Warranty, Invoice, Tax return, Bank account, …) that prefills its Vault category and Fields.
_Avoid_: Preset, form

**Pinned**:
An Entry marked for quick access at the top of the Vault.
_Avoid_: Favorite (that is a Shopping term), starred

### Showing the app

**Demo**:
A separate copy of Nest, with its own data, secrets and address, filled with made-up people and money so the app can be shown without showing a real Household. It can be reset to a clean state at any time, and it never shares data or sign-in with the real app.
_Avoid_: Test environment, sandbox, staging (those are places to try out changes, not to show the app)
