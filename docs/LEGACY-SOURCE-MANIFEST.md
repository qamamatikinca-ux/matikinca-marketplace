# Legacy Source Manifest

The uploaded project contained many historical repair installers, one-off JavaScript patchers, duplicate SQL files, backup folders and nested update ZIPs. They are not part of the active professional release because leaving them beside production source created deployment ambiguity and regression risk.

## Preserved outside the clean release

The historical workflow and installer files were copied to the audit workspace at:

`/mnt/data/loadlink_implementation/legacy-source-artifacts`

They are not required to run the new release and are not included in the deployable ZIP.

## Original evidence

- Uploaded source: `matikinca-marketplace-main 14.zip`
- Original SHA-256: `0a5a6ed063974b59ba2de4cf2413fa93d5374f32032c15d1f81737afd81cdf0a`
- Permanent workflow retained: `.github/workflows/quality-gate.yml`
- One-time cleanup workflow: `.github/workflows/install-loadlink-professional-release.yml` (removes itself after committing the cleanup)
- Ordered database update retained: `supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql`

## Excluded categories

- `.loadlink-backup`
- Root-level `install-*.js` and `fix-*.js` repair scripts
- Old independent `LOADLINK-*.sql` and `supabase-*.sql` files
- Nested hotfix ZIPs
- Historical “installed” marker text files
- Old duplicated GitHub installer workflows
- Nested patch source folders

This cleanup does not delete production data and does not modify LDE2.
