# LoadLink Release QA Checklist

## Synchronization checks

- Listing submission creates one record and one review-queue item.
- Approval updates the database, My Posts, public page, notification and audit trail together.
- Rejection includes a visible reason and returns an edited listing to review.
- Dealership approval changes business status, public directory visibility and user notification together.
- Dealership stock changes update the dealership page and homepage slider.
- Driver approval updates the profile, directory visibility and contact controls together.
- Verified payment updates the payment record, package access, limits, expiry and billing history once.
- Blocking a user prevents new messages from both directions.
- Read/unread counts agree on the homepage, menu, chat list and conversation.
- Theme, saved items and saved searches persist after refresh and another sign-in.

## Marketplace checks

- Work, Contracts and Vehicles never mix records incorrectly.
- Vehicle filters, sorting, URL state, 7-item pagination and zero-result recovery work.
- Compare supports no more than four vehicles.
- Permanent listing URLs survive refresh and invalid IDs show a recovery page.
- Vehicle pages show all images, core specs, seller details, report, save, share and similar stock.
- Sponsored content is labelled and has an end date.
- Expired, rejected, sold or archived records are not returned publicly.

## Security and privacy checks

- Anonymous APIs never return user IDs, owner keys, contact control fields or private document paths.
- A normal user cannot approve, feature, verify or publish their own restricted record.
- Listing edits/deletes work only for the signed-in owner.
- Conversations work only for signed-in participants.
- Verification, driver, dealer and vehicle documents remain private and use short signed URLs for staff review.
- Unsafe file types, oversized files and dangerous PDFs are rejected.
- Payment webhooks with missing or incorrect signatures are rejected.
- Admin pages reject normal accounts.

## Mobile and accessibility checks

- Test 320px, 375px, 390px, 430px, tablet portrait/landscape, laptop and desktop.
- Test iOS Safari keyboard, input zoom, safe areas, file upload, voice-note permission and back navigation.
- Every button has a visible focus state and at least a 44px touch target.
- Dialogs trap focus, close with Escape and restore focus.
- Dark and light mode keep readable text, fields, errors, overlays and disabled controls.

## Release sign-off

Record the tester, date, browser/device, role and evidence for each failed item. No P0 or P1 failure may be waived without a written rollback plan.
