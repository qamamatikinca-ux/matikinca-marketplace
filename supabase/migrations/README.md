# LoadLink ordered migrations

1. Create a Supabase backup.
2. Apply `20260801_000001_loadlink_professional_marketplace.sql` once in the SQL editor or through the Supabase CLI.
3. Confirm the `loadlink_schema_versions` row exists.
4. Run the checks in `DEPLOYMENT-GUIDE.md` before deploying the website.

The migration is idempotent and does not alter LDE2 files. It replaces browser-held owner keys with authenticated ownership, creates public-safe views, adds the synchronization/event foundation, and introduces the operational tables required by the professional marketplace.
