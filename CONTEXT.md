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

**Statement import**:
Reading a bank statement (a CSV file) for one Financial account, to find its Recurring items: the Payments it contains are recorded and what comes back on a Schedule is offered as Suggestions. It is a way to add Recurring items, alongside typing one in, not a way to manage transactions.
_Avoid_: Upload, sync, transaction import

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
The daily message a Member gets on their phone listing what is due for them today, with a single nudge once something is 2 days overdue. Overdue Reminders after that stay red in the app but do not notify again. One more Notification is sent once per cycle for each Financial account whose Statement import is due: 90 days after its last import (or after it was made), naming the dates to export, from the day of the last import to yesterday. A late import only makes the range longer, and the 90 days start again from the day it is imported. The daily message also mentions a Vault Entry about to expire, once at 60 days and once at 14 days ahead. Nothing else notifies; Suggestions and Budgeted amount approvals are in-app only. Every Notification is also recorded in Earlier.
_Avoid_: Alert, ping, Inbox item (that is the in-app list, not the phone message)

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

### Notes

**Note**:
A piece of writing a Member wants to keep and come back to: a title and a body (headings, bullet lists and checkboxes) they can open and edit, showing when it was created and last edited. Can be Pinned to the top of its Notebook. Lives in one Notebook and is Shared or Personal as that Notebook is. Not a Vault Entry, which keeps IDs, numbers and documents.
_Avoid_: Memo, document, entry (that is a Vault term), log

**Notebook**:
A named group of Notes, Shared or Personal like a Shopping list, with Visibility if Personal. A Note is in exactly one Notebook and takes its ownership from it. Each Household starts with a Personal Notebook called "Notes", hidden from the rest of the Household and not deletable. Deleting any other Notebook deletes its Notes.
_Avoid_: Folder, tag, category, collection

### Movies & Series

**Title**:
One film or series a Household wants to watch or has watched: a name, a Kind (Movie or Series) and a Status (Want to watch, Watching, Watched). Each Member rates it separately (5 stars, half steps) and may leave a short note; the date it was watched is recorded. Lives in one Watchlist. The entry, not a text field called "title".
_Avoid_: Movie (alone — excludes series), film, show, entry (that is a Vault term)

**Watchlist**:
A named group of Titles, Shared or Personal with Visibility if Personal, exactly like a Cookbook. A Title is in exactly one Watchlist and takes its ownership from it. Each Household starts with a Shared Watchlist called "Watchlist", not deletable. Deleting another Watchlist asks where its Titles go (default: "Watchlist") or offers to delete them, with a warning when Personal Titles would become Shared.
_Avoid_: Queue, Shopping list

### Recipes

**Recipe**:
A way to cook something, kept in one Cookbook: a name, Ingredients, steps, a servings number, an optional photo and an optional source link. Can be typed in or imported from a web page into an editable draft. Its Ingredients can be added to a Shopping list.
_Avoid_: Dish, meal, document

**Ingredient**:
One free-text line of a Recipe ("200 g flour"). Not split into amount, unit and name. Added to a Shopping list, the whole line becomes the Shopping item's name.
_Avoid_: Product, item

**Cookbook**:
A named group of Recipes that Members create (Baking, Weeknight dinners), Shared (the default; every Member may edit) or Personal with Visibility, like a Notebook. A Recipe is in exactly one Cookbook and takes its ownership from it. Each Household starts with a Shared Cookbook called "Recipes", not deletable. Deleting another Cookbook asks where its Recipes go (default: "Recipes") or offers to delete them, with a warning when Personal Recipes would become Shared.
_Avoid_: Folder, tag, category, collection

### Home

**Today**:
The home page of the app: a place to do small things without going to their pages. It opens with Quick add, followed by a short glance at the Todos, the main Shopping list and the Reminders due in the next 7 days. It replaces the former Dashboard, which only pointed to other pages.
_Avoid_: Dashboard, home screen

**Quick add**:
One line at the top of Today that creates a Todo, a Shopping item or a Reminder without leaving the page. The kind is picked first (Todo is the default), and only kinds whose Module is on are offered. It never creates transactions or Vault Entries.
_Avoid_: Add button, shortcut

**Notification centre**:
The panel behind the bell in the top bar, opened from any page. The Inbox is its top part and Earlier is below it. The bell's badge counts the Inbox items plus the unread entries in Earlier.
_Avoid_: Notifications page, activity feed

**Earlier**:
The record of the Notifications sent to a Member, newest first, kept for 30 days and recorded whether or not their phone has push switched on. One entry per message sent. An entry is unread until the Member opens the Notification centre, and read once they close it. Nothing else is recorded here: not what a partner did, and not what the Member finished.
_Avoid_: History, log, feed

**Inbox**:
The live list of everything that needs a Member now — something with a deadline, or waiting on a decision. It sits at the top of the Notification centre. It has no read or dismissed state: an Inbox item stays until the thing behind it is dealt with, and then it is gone. Open Todos and the Shopping list never appear in it.
_Avoid_: Feed, alerts

**Inbox item**:
One row in the Inbox: a Reminder due or overdue, a Statement import that is due (90 days since the last one, with the dates it must cover), a Vault Entry about to expire, a Suggestion waiting to be confirmed, or a Budgeted amount change waiting for approval. Each leads to the place where it is dealt with. A Member sees only their own Inbox items and Household-wide ones: a Personal account's due Statement import shows only to its owner, and Suggestions only to theirs. Items are listed most urgent first, each labelled with its kind. With none, the Inbox says "You're all caught up".
_Avoid_: Notification (that is the phone message), alert, task

### Showing the app

**Demo**:
A separate copy of Nest, with its own data, secrets and address, filled with made-up people and money so the app can be shown without showing a real Household. It can be reset to a clean state at any time, and it never shares data or sign-in with the real app.
_Avoid_: Test environment, sandbox, staging (those are places to try out changes, not to show the app)
