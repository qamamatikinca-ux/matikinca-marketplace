# LoadLink Professional Logistics Marketplace

This release upgrades LoadLink into one synchronized logistics marketplace for:

- Work opportunities
- Contracts
- Commercial vehicles
- Dealerships
- Driver profiles
- Secure messaging
- Packages, payments and administration

The approved LoadLink black, white and gold identity is preserved. LDE2 was not changed.

## Start here

Read `START-HERE.txt` before uploading the update.

## Important files

- Database update: `supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql`
- Deployment guide: `docs/DEPLOYMENT-GUIDE.md`
- Full 140-update map: `docs/IMPLEMENTATION-MAP.md`
- External activation list: `docs/EXTERNAL-ACTIVATION-CHECKLIST.md`
- Release validation: `docs/VALIDATION-REPORT.md`
- Final testing checklist: `docs/QA-CHECKLIST.md`

## Local commands

```bash
npm ci
npm run check
npm run lint
npm run build
```

The GitHub workflow at `.github/workflows/quality-gate.yml` runs the same checks and the production build before deployment.
