# LoadLink Deployment Guide

## 1. Protect the current version

1. Download a backup of the current GitHub repository.
2. Create a Supabase database backup.
3. Save the current working Vercel deployment as the rollback point.

## 2. Apply the database update

Open Supabase → SQL Editor and run:

`supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql`

Run it once as one complete file. Do not run the old independent SQL repair files after this migration.

## 3. Confirm server environment variables

Keep the existing public Supabase variables. Add these server-only values in Vercel when their integrations are enabled:

- `SUPABASE_SERVICE_ROLE_KEY` — server only; never prefix with `NEXT_PUBLIC_`.
- `LOADLINK_PAYMENT_WEBHOOK_SECRET` — required before payment webhooks are accepted.
- `LOADLINK_PAYMENT_CHECKOUT_URL` — secure provider checkout endpoint.

Optional monitoring, email, SMS, maps and media-processing keys should also remain server-only.

## 4. Upload the clean project

Upload the contents of the delivered project folder to the repository root. Do not upload the outer ZIP as one file.

## 5. Run the one-time repository installer

Open Actions → **Install LoadLink Professional Release** → Run workflow. It removes only the known historical installers, duplicate SQL repair files, patch ZIPs and old workflow files from the uploaded repository. It commits those deletions and removes itself, leaving the professional quality gate as the normal active workflow.

## 6. Verify GitHub Actions

Open Actions → **LoadLink Quality Gate** → Run workflow if it did not start automatically. It checks all 140 recommendations, marketplace/security contracts, TypeScript syntax, SQL integrity, asset budget, lint and the production build.

## 7. Deploy to Vercel

Deploy only after the quality gate passes. Confirm that Vercel uses the same Supabase project and approved environment variables.

## 8. Run the release checklist

Use `docs/QA-CHECKLIST.md`. Test signed-out, Standard, Pro, Dealership, Worker and Administrator roles. Do not mark the release complete until database state, user account, notification, Control Centre and public page agree after each important action.

## Rollback

If a production-blocking problem appears, restore the previous Vercel deployment first. Keep the database backup until all P0/P1 journeys pass. The migration is additive, but do not manually delete new tables during an emergency rollback.
