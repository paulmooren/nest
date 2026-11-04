# A statement is asked for every 90 days, with the dates it must cover

> Supersedes the monthly "last month's statement" push and Inbox row of [ADR 0010](0010-pushes-limited-to-reminders-vault-expiry-and-missing-statements.md). The rest of ADR 0010 (which things push, never daily) still stands.

Each Financial account is due a statement 90 days after its last Statement import, or after the day it was made while nothing was imported yet. The Inbox row and the push both say which dates to export: from the day of the last import to yesterday. An import covers up to the day before it, so the next range starts on the day of the previous import. Waiting longer only makes the range longer; importing sets the account's `lastImportedOn` to that day and the 90 days start again. A push is sent once per cycle (`statementPushedFor` holds the cycle's start date), on the first daily check on or after the due day, so a missed day catches up; after that the account stays in the Inbox only.

We chose this over "last month's statement on the 1st" because a month-based check nags for a statement that is only a few days old, says nothing about how far back to export, and fires again even when the Member imported a bit late. A per-account date makes the reminder follow when the Member actually imported. The file's own transaction dates are not used for the clock, only the import day: they depend on what the bank exports.

Existing accounts were given a start at the day after their newest transaction when this was introduced, so they did not all become due on the same day.
