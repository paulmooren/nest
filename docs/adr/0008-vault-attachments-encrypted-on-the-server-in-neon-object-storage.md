# Vault Attachments are encrypted on the server and kept in Neon Object Storage

The Vault now holds files (scans, invoices, warranties) as Attachments on an Entry. Each file is encrypted in the application with the same server-held key as Vault values (see ADR 0001, which this extends and whose "files are out of scope" line it supersedes), then stored in a private bucket in Neon Object Storage (Frankfurt). Opening one goes through an authenticated route that decrypts on demand and is never cached. We chose Neon Object Storage over Vercel Blob because it branches with the database, so dev and the Demo get their own files without extra setup, and over Postgres storage because files would bloat the database.

Because the server must see the bytes to encrypt them, uploads pass through a Vercel function, which limits a request to about 4.5 MB. Attachments are therefore capped at 4 MB each (10 per Entry), and the browser shrinks phone photos before upload. Direct-to-storage upload followed by server-side encryption would lift the cap but was rejected as much more complex for documents that are usually small.

## Consequences

- Attachments are never included in data export, same as values.
- The Vault key now protects files too; losing it makes both unrecoverable and it must still be backed up separately.
- The Demo must have its own bucket; Attachments are never shared across environments.
- Anyone with server and environment access can decrypt files, as with values.
- The 4 MB cap should be revisited if it gets in the way.
