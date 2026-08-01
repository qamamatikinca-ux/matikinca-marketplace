# Security and Synchronization Notes

## One account owns each private action

Listings, saved records, conversations, dealerships and driver profiles are linked to the signed-in Supabase account. Legacy browser ownership keys are cleanup-only and cannot grant control.

## One public view controls public data

Public pages use approved public projections. Private ownership IDs, identity documents, internal moderation data and private contact controls are not returned in anonymous listing or driver responses.

## Packages are enforced by the database

The browser may display a selected package, but it cannot activate Pro or Dealer privileges. The database derives the effective package from an active subscription or an unused paid manual-listing access period.

For a vehicle listing, the same transaction now:

1. Confirms the signed-in owner.
2. Confirms paid access.
3. Applies the correct image limit.
4. Consumes manual access once when applicable.
5. Sets expiry and pending moderation.
6. Prevents browser-controlled sponsorship or approval.

## Dealership approval is staff-controlled

A dealership owner can edit business information, but cannot set approved, public, featured or trust fields. An active Dealer subscription is required before profile creation and stock attachment.

## Administrative decisions synchronize together

Approved administrative actions update the main record, public visibility, user notification, marketplace event and audit history in one database transaction.

## Secrets stay on the server

`SUPABASE_SERVICE_ROLE_KEY`, payment webhook secrets and provider credentials must never use the `NEXT_PUBLIC_` prefix.
