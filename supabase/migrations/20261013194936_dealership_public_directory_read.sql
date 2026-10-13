-- Retain the existing approved public marketing projection and eligibility rules.
-- Inline eligibility checks so public reads never require access to private helper RPCs.
-- No subscriptions or moderation data are changed or exposed.
create or replace view public.public_dealership_profiles with (security_barrier = true) as
 SELECT id,
    slug,
    name,
    profile_image_url,
    cover_image_url,
    short_bio,
    business_description,
    physical_location,
    contact_email,
    phone_number,
    whatsapp_number,
    website_url,
    trading_hours,
    year_established,
    average_response_minutes,
    response_rate,
    created_at,
    ( SELECT count(*) AS count
           FROM dealership_followers f
          WHERE f.dealership_id = p.id) AS follower_count,
    ( SELECT count(*) AS count
           FROM job_listings j
          WHERE (j.dealership_id = p.id OR j.dealership_id IS NULL AND j.user_id = p.owner_user_id) AND j.listing_kind = 'vehicle'::text AND (j.stock_status = ANY (ARRAY['available'::text, 'reserved'::text])) AND j.lifecycle_status = 'live'::text AND j.moderation_status = 'approved'::text AND (j.expires_at IS NULL OR j.expires_at > now()) AND NOT EXISTS (SELECT 1 FROM public.marketplace_user_restrictions r WHERE r.user_id = j.user_id AND r.status IN ('suspended','banned') AND (r.suspended_until IS NULL OR r.suspended_until > now()))) AS active_listing_count
   FROM dealership_profiles p
  WHERE verification_status = 'approved'::text AND platform_status = 'active'::text AND is_public = true AND showroom_status = 'live'::text AND NOT EXISTS (SELECT 1 FROM public.marketplace_user_restrictions r WHERE r.user_id = p.owner_user_id AND r.status IN ('suspended','banned') AND (r.suspended_until IS NULL OR r.suspended_until > now())) AND EXISTS (
 SELECT 1 FROM (SELECT s.* FROM public.user_subscriptions s WHERE s.user_id = p.owner_user_id AND s.plan_code = 'dealer' ORDER BY s.created_at DESC LIMIT 1) subscription
 WHERE CASE lower(coalesce(subscription.status,'expired'))
 WHEN 'trial' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) IS NULL OR coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'trialing' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) IS NULL OR coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'active' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) IS NULL OR coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'grace' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) IS NULL OR coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'grace_period' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) IS NULL OR coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'cancelled' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'canceled' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at) > now()
 WHEN 'past_due' THEN coalesce(subscription.current_period_end,subscription.ends_at,subscription.renews_at,subscription.updated_at,subscription.created_at) + interval '5 days' > now()
 ELSE false END
);
