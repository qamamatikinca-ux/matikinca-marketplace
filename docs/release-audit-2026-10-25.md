# LoadLink release audit — 25 October 2026

Status: targeted fixes verified; full release sign-off remains open.

## Confirmed findings and changes

| Finding | Resolution |
| --- | --- |
| Next.js 16.4.0 had critical dependency advisories | Upgrade Next.js and matching ESLint config to 16.4.3; refresh vulnerable transitive Zod dependency. Audit reports zero known dependency vulnerabilities after update. |
| Push subscription URLs were not restricted before server delivery | Validate known browser push provider HTTPS destinations both when saving and sending; reject credentials, custom ports and arbitrary hosts; add delivery timeout and regression tests. |
| Legacy public database views did not consistently enforce current showroom/restriction rules | Applied `public_visibility_audit` migration. Legacy dealership rows excluded by canonical rules reduced from two to zero. Restricted-owner listings excluded. |
| Two database functions lacked fixed search paths | Applied fixed pg_catalog paths for these simple functions. |
| Package page and secondary cards displayed R15 while live catalog/checkout use R14 | Use shared daily-price constant and returned catalog price; retain R14 billing. |
| Package promises and fallback photo limits disagreed with database limits | Align Standard/Manual 2, Pro 10, Dealer 30 photos; disclose 5/10/unlimited monthly vehicle listing limits. |
| Dealer API could return internal server diagnostics | Sanitize server-error responses and prevent caching. |
| Tests required generated assets and were absent from the release workflow | Add npm test/pretest and regression/security checks to existing PR workflow. |

| Support sign-in link used an ignored return parameter | Use the login route’s `next` parameter so users return to their support cases. |
| Support and draft-toast refs were mutated during render | Synchronize refs after commit; show a loading message while a selected case loads. |

| Daily credit button announced unavailable payments during initial loading | Show a checking-pricing state until the catalog request completes. |

## Verification performed

- Clean production build and TypeScript compilation passed after clearing a corrupt local build cache.
- 52 existing and new regression tests passed.
- npm audit reported zero known vulnerabilities after dependency updates.
- Initial HTTP scan of 62 static route paths returned 200 responses. This proves route reachability only, not authenticated functionality.
- Browser inspected homepage, search results, a vehicle detail, jobs, contracts, drivers, dealerships, packages and help. Some data-backed pages were observed during loading and are not counted as complete flow passes.
- Signed-out Control Centre root redirected to sign-in without dashboard content.
- Production runtime error query returned no recorded errors for its seven-day window; this does not prove absence of bugs.
- Database checks verified profile privilege guards, staff session checks behind payment administration, and that the legacy listing-claim function is not executable by authenticated clients.
- Post-migration checks found zero legacy dealership rows outside canonical visibility and zero restricted-owner listings in the audited public view.

## Remaining release gates

- Full repository lint initially reported 252 errors and 166 warnings, including older archived installer source, CommonJS tests and React effect warnings. These are not 418 confirmed runtime bugs. The full baseline is not clean and needs triage.
- Supabase reports leaked-password protection disabled; the current connector does not expose Auth configuration updates.
- In-memory API rate limits are per instance and do not provide a distributed abuse limit.
- Public and authenticated database RPC permissions need comprehensive role-by-role regression tests; sampled checks are not exhaustive authorization testing.
- Sign-in/recovery, ordinary member and dealer sessions, staff role boundaries, revoked sessions, uploads, support escalation, voice calls and payment/webhook lifecycle still need authenticated end-to-end tests in a controlled test environment.
- Mobile Safari, Android, keyboard-only navigation, screen readers, low bandwidth, concurrent submissions and payment-provider outages need explicit acceptance coverage.
- Real payments, customer messages, account deletion and driver approval decisions were not performed during this audit.

No claim is made that every bug has been found or that the site is 100% secure. Application changes in this commit require a verified deployment; the database migration was already applied and verified separately.
