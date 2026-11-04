# Reminder notifications are web push sent by one daily scheduled check

> Partly superseded by [ADR 0010](0010-pushes-limited-to-reminders-vault-expiry-and-missing-statements.md): one extra push is sent on the 1st of the month for a missing statement, and the push rules are listed there.

Reminders notify the people they are assigned to through web push (the installed Nest web app), sent by a single scheduled job that runs once a day at a household-wide time (default 10:00 Amsterdam) and sends one message listing everything due. We chose this over email (needs a verified sending domain) and over per-person or per-reminder times (needs a scheduler that runs more often than the free hosting plan's once-a-day limit). The trade-off is that the send time can drift by up to an hour and cannot differ per person; moving to a paid plan removes that limit without changing the data model.

## Consequences

- iPhones only receive notifications once Nest is added to the Home Screen and notifications are switched on inside it; everyone sees what is due in the app regardless.
- Needs a VAPID key pair on the server and a stored push subscription per device.
