# LoadLink reliability and daily listings

The baseline is marketplace main commit e85a368c3a0521f43c8dde3c5f155b3b341293cc,
which matches the primary Vercel production deployment inspected for this repair.
The connected database is cqmjgulfbbwxyecsnzed. The existing visual identity and
separate corporate Control Centre are preserved.

Changes:

- New Standard vehicle credits cost R15 per active day. Approval starts paid time;
  pausing preserves unused time; subsequent days consume prepaid daily credits.
  No automatic card debit or unpaid debt is created. Existing ten-day credits and
  previously created checkout snapshots retain their original duration.
- Owner recommendations examine approval age, recent listing views, actual buyer
  messages and listing completeness. New, inactive, expired, restricted, already
  promoted and pending-boost listings are excluded. Notifications are limited to
  one per owner daily and one per listing weekly; reminders can be dismissed.
- Optional promotion retains the existing R14/seven-day manual review model.
  Server checks require the listing owner and prevent duplicate pending orders.
- Calls retain one global lifecycle across navigation, serialize WebRTC signals,
  reconnect incoming polling to the signed-in account and release microphone
  resources on termination. Relay settings are fetched after authentication.
- Voice notes handle pending permission races, recorder errors, conversation
  changes and browser playback failures. Reconnection refreshes messages.
- Public listing RPCs return an explicit projection. Browser roles cannot read
  owner keys. Dealership approval fields and call signal direction are guarded.
  Dynamic follow-up content uses DOM text instead of HTML interpolation.
- Next.js 16.4.0, React 19.3.0 and Supabase JS 2.117.3 are pinned with the lockfile.
  Runtime npm audit reported zero findings; five high warnings remain in the
  development-only eslint/brace parser chain. Downgrading Next's lint config to
  remove those warnings would introduce a framework mismatch.

Validation:

- Production build, TypeScript and whitespace checks pass locally.
- PostgreSQL syntax parsed for the full migration. The pricing and activation
  function replacements were also checked in a database rollback transaction.
- `supabase/tests/daily_listing_security.sql` validates new credit activation,
  pause/resume, cross-owner denial, self-approval denial, idempotent daily renewal,
  recommendation eligibility and duplicate boost prevention. Its generated test
  accounts and records are deliberately rolled back even when it succeeds.
- Device-to-device calls, iOS/Android microphone playback, hosted Paystack test
  checkout and authenticated visual journeys still need physical-device/browser
  verification. A configured TURN relay is necessary for reliable calling across
  some mobile and corporate networks.

Release status must be recorded from actual GitHub/Vercel/database results;
passing a build alone does not close all historical audit P0/P1 findings.
