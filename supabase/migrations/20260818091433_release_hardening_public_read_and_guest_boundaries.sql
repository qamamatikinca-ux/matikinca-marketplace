begin;

revoke insert, update, delete on table public.content_pages from anon;
revoke insert, update, delete on table public.dealership_profiles from anon;
revoke insert, update, delete on table public.dealership_promotions from anon;
revoke insert, update, delete on table public.dealership_updates from anon;
revoke update, delete on table public.job_listings from anon;
revoke insert, update, delete on table public.subscription_plans from anon;
revoke all privileges on table public.profiles from anon;

revoke all privileges on table public.guest_chat_plans from anon, authenticated;
revoke all privileges on table public.listing_guest_attachments from anon, authenticated;
revoke all privileges on table public.listing_guest_blocks from anon, authenticated;
revoke all privileges on table public.listing_guest_messages from anon, authenticated;
revoke all privileges on table public.listing_guest_reports from anon, authenticated;
revoke all privileges on table public.listing_guest_threads from anon, authenticated;

revoke insert, update, delete on table public.loadlink_public_dealerships from anon, authenticated;
revoke insert, update, delete on table public.loadlink_public_driver_profiles from anon, authenticated;
revoke insert, update, delete on table public.loadlink_public_listings from anon, authenticated;
revoke insert, update, delete on table public.public_dealership_profiles from anon, authenticated;
revoke insert, update, delete on table public.public_dealership_slug_redirects from anon, authenticated;
revoke insert, update, delete on table public.public_dealership_statuses from anon, authenticated;
revoke insert, update, delete on table public.public_dealership_updates from anon, authenticated;

commit;
