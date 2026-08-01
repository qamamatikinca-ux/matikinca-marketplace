# LoadLink Professional Marketplace Update

## What this update changes

This release turns LoadLink into a connected professional logistics marketplace instead of a collection of separate pages.

- Six clear marketplace areas: Work, Contracts, Vehicles, Dealerships, Drivers and Messages.
- AutoTrader-style commercial-vehicle search, filtering, sorting, comparison and permanent detail pages.
- Live dealership directory, public dealership pages and synchronized dealership inventory slider.
- Separate Jobs and Contracts marketplaces with permanent detail pages, saved searches, alerts and Express Interest.
- Professional driver profiles, filtered directory, protected contact access and document-expiry foundations.
- Signed-in account ownership for listings and conversations. Browser-generated ownership keys are retired.
- Secure uploads with file-signature validation, private document buckets and safer message attachments.
- Verified-payment-only package activation, database-derived plan limits, transactional manual-access consumption, payment event idempotency, invoice/dispute foundations and expiry controls.
- One Corporate Control Centre for listings, users, dealerships, drivers, cases, fraud, reviews, payments, support, content, notifications and health. Listing, dealership, driver, review, case, ticket and fraud decisions now synchronize through protected administrative actions.
- Accessible dialogs replace browser prompts for destructive or review actions.
- Consistent LoadLink header, footer, dark/light tokens, mobile filter drawers, sticky contact actions and 7-item pagination.
- Large bundled images compressed without changing routes or the LoadLink visual identity.
- Ordered Supabase migration, automated contract tests, a self-removing one-time repository installer, permanent quality workflow and clean release structure.

## Preserved exactly

- LoadLink name, logo, black/white/gold design language and approved navigation style.
- Existing Google authentication and Supabase environment variable names.
- Existing users, listings, messages and production data; the migration is additive and idempotent.
- LDE2 was not changed.

## Important deployment rule

Apply the ordered migration before deploying the application. Packages, saved searches, moderation queues, safe views and account-participant messaging rely on it.
