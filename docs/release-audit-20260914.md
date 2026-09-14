# Release audit and database migration — 14 September 2026

## Result

Applied 10 reviewed migrations to the configured Supabase database at 16:51 UTC. The transaction compared every original column in 184 pre-existing rows across 55 application/archive tables before and after the changes. No original field values or records changed. Migration ledger entries were added after verification. The application has not been deployed by this audit.

## Backup

- File: `data/backups/pre-release-2026-09-14T16-50-14-101Z/application.dump`.
- SHA-256: `f21e159a01bfe5e4d7a21383cea5cbb35bfc1925499f020da0181803a82e7c47`.
- Includes `public`, `payments`, and `migration_archive_20260713`; provider-managed auth/storage schemas were not modified.
- Archive validation, full restore into isolated PostgreSQL 17, and rehearsal of the exact migration plan succeeded before the hosted migration.
- The directory also contains `manifest.json`, `rehearsal.json`, and `migration-result.json`.
- Backups and `.env.local` are excluded from Git.

## Verification

- All 17 unit test files passed, including notification sharing, business approval, moderation, and encryption.
- Payment integration: 30 tests passed in a separate local test database.
- All 18 browser scenarios passed. One cross-tab session timing assertion needed a retry during a concurrent build; two subsequent runs passed with retries disabled.
- Production build and TypeScript passed.
- Repository lint: zero errors and 203 warnings before fixes. Targeted lint after fixes has one warning for the notification bell's initial asynchronous fetch.
- Sitemap pages returned successful responses with descriptions, indexable metadata, matching canonical URLs, and parseable structured data.
- Post-migration read-only application queries generated 23 unique sitemap URLs and successfully loaded chat lists for all 31 active accounts.
- New CRM/business-introduction tables have row-level security enabled.

## Fixes

- Notification bells and chat popups share one EventSource per tab. Previously their separate streams could exhaust HTTP/1.1 connections across two tabs and block logout.
- Private buddy interests have crawler exclusions and private/noindex response headers.
- Organization structured data includes the supplied LinkedIn, Product Hunt, and KittyLaunch profiles.
- Public URL environment values no longer have trailing slashes.
- Three legacy buddy trips retain their saved durations. New or changed durations are validated; unrelated edits still work. Verified in a rolled-back local transaction.
- `ALLOW_RUNTIME_SCHEMA_DDL=false` prevents automatic schema changes against the configured hosted database, including development startup.

## Remaining launch configuration and preserved data

- Hosted maintenance mode was already enabled and remains enabled.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-23RKGDFD6H` is configured locally and matches the application's default ID. The deployment environment check now passes; use the same ID in the hosting environment.
- Three existing messages retain their original storage format and content. This was a schema migration, not a message-content rewrite. Deploy the server-managed chat implementation with the persistent `CHAT_ENCRYPTION_KEY` before running `scripts/encrypt-existing-chat-messages.mjs` to convert them. That script verifies decryption before each update. Keep the backup and encryption key securely.
- Historical migrations that delete story data, reset credits, rewrite durations, or add retired device/account encryption setup were not replayed.

## Migration procedure

Use `scripts/apply-release-migrations.mjs`, not a loop over every historical SQL file. It requires a backup and successful rehearsal, checks migration checksums, briefly locks existing application tables, verifies original row values, and rolls back on failure. Already-recorded migrations are skipped.
