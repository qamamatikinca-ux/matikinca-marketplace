create or replace view public.public_dealership_profiles with (security_barrier = false) as
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
          WHERE (j.dealership_id = p.id OR j.dealership_id IS NULL AND j.user_id = p.owner_user_id) AND j.listing_kind = 'vehicle'::text AND (j.stock_status = ANY (ARRAY['available'::text, 'reserved'::text])) AND j.lifecycle_status = 'live'::text AND j.moderation_status = 'approved'::text AND (j.expires_at IS NULL OR j.expires_at > now()) AND NOT loadlink_marketplace_is_restricted(j.user_id)) AS active_listing_count
   FROM dealership_profiles p
  WHERE verification_status = 'approved'::text AND platform_status = 'active'::text AND is_public = true AND showroom_status = 'live'::text AND NOT loadlink_marketplace_is_restricted(owner_user_id) AND ((loadlink_dealer_subscription_state(owner_user_id) ->> 'status'::text) = ANY (ARRAY['active'::text, 'past_due'::text, 'grace_period'::text]));
