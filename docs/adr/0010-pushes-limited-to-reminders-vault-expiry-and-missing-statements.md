# Pushes are limited to Reminders, Vault expiries and missing statements; other Inbox items stay in the app

> The monthly missing-statement push described here is replaced by [ADR 0011](0011-statement-reminder-every-90-days.md): a statement is asked for every 90 days.

The daily web push from ADR 0002 keeps listing what is due for a Member today, and keeps mentioning a Vault Entry about to expire (once at 60 days and once at 14 days ahead). Beside it, one extra push goes out once, on the 1st of the month, for each Financial account still missing last month's Statement import. Suggestions and Budgeted amount approvals send no push. We chose this over pushing every Inbox item because those items change slowly: a daily push for each would repeat the same message every morning for days, and people would learn to ignore the phone message that matters. Each pushed kind has a clear moment it becomes true and is mentioned a fixed number of times, never daily.

This replaces the "one daily message" part of ADR 0002. Everything else there (web push, the single scheduled job, the household-wide send time) still stands.

## Consequences

- The scheduled job now sends two kinds of message on the 1st. The statement push goes out in the same run as the daily message, so the once-a-day guard already stops a retried run from sending it twice; no extra record is needed.
- A Member who never opens the app sees Suggestions and approvals only when they next do.
- Adding a new kind of push later needs the same case made: a clear moment it becomes true, and no daily repeat.
