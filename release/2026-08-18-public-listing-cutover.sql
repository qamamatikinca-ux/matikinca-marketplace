-- LOADLINK RELEASE CUTOVER
-- Run only AFTER the release-hardening branch is deployed to production and
-- /api/job-listings + /api/listings/[id] are confirmed to read loadlink_public_listings.
--
-- Purpose: remove anonymous direct SELECT access to the 83-column operational
-- job_listings table. Public marketplace reads must go through the safe projection.

begin;

revoke select on table public.job_listings from anon;

commit;

-- Post-cutover verification:
-- select privilege_type
-- from information_schema.role_table_grants
-- where table_schema='public'
--   and table_name='job_listings'
--   and grantee='anon';
-- Expected: no rows.
--
-- Then smoke-test:
--   GET /api/job-listings?kind=job&page=1&limit=7
--   GET /api/job-listings?kind=contract&page=1&limit=7
--   GET /api/listings/<approved-listing-id>
--   /listing/<approved-listing-id>
