# Sent Notifications are stored for 30 days; the Inbox stays computed

The Notification centre has two parts that work differently on purpose. The Inbox on top is computed on every load from the current state of the app (ADR 0010 lists what counts), so it has no read state and a row disappears once the thing behind it is dealt with. Earlier below it is stored: when the scheduled job sends a Notification, it also writes one entry per message to each recipient, whether or not their phone has push switched on. Entries are unread until the Member closes the panel, and are deleted after 30 days.

We chose this over computing everything, which cannot show a Notification again once what it was about has changed, and over storing everything (an Inbox with read and dismissed state, or a record of what partners did and what a Member finished). A stored Inbox would go stale and need cleaning up. Partner activity and finished things would need an event record for every action in the app, which is far more than the three kinds of message there are today. Storing only what was sent keeps push and the panel in step, and gives iPhone users, who only get pushes once Nest is on the Home Screen (ADR 0002), a way to read what they missed.

## Consequences

- A new table, one row per Member per message sent, written by the scheduled job in the same run that sends the push. The once-a-day guard already stops a retried run from writing it twice.
- Earlier shows the message as it was sent, even after the Reminder it mentions was ticked off. The Inbox is where current state lives.
- Adding another kind of Notification means it also appears in Earlier with no extra work, but adding partner activity or finished things would be a new decision.
- Deleting entries older than 30 days has to happen somewhere, most simply in the same daily job.
