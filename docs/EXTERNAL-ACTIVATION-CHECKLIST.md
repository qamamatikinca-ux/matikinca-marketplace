# Controlled Production Activations

The following foundations are included but should not be switched on blindly:

- Payment provider checkout, webhooks, refunds and tax invoice identity.
- Email, SMS or push delivery for saved-search and status alerts.
- Maps/geocoding for radius and distance search.
- CDN/media processing for uploaded image and video derivatives.
- Error monitoring/tracing destination and alert recipients.
- Scheduled workers for expiry, abandoned-upload cleanup, recurring work and SLA escalation.
- Fraud thresholds, duplicate detection weights and automatic moderation.
- Public dealership-review publication policy.
- Dealership bulk-import templates, campaign rules and staff lead routing.
- Proof-of-completion and driver-reference retention/legal policy.

Each activation must first be tested in a staging Supabase project with no production private documents.
