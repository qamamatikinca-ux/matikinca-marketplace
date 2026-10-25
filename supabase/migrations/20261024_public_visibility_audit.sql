-- Align legacy public projections with the canonical showroom access rules.
-- Preserve each view's columns and existing consumers; only narrow visibility.
CREATE OR REPLACE VIEW public.loadlink_public_dealerships AS
SELECT id,
    slug,
    name,
    profile_image_url,
    cover_image_url,
    short_bio,
    business_description,
    physical_location,
    province,
    contact_email,
    phone_number,
    whatsapp_number,
    website_url,
    trading_hours,
    year_established,
    verification_status,
    average_response_minutes,
    trust_score,
    is_featured,
    created_at,
    ( SELECT count(*) AS count
           FROM job_listings j
          WHERE ((j.dealership_id = d.id) AND (j.listing_kind = 'vehicle'::text) AND (COALESCE(j.moderation_status, 'approved'::text) = 'approved'::text) AND (COALESCE(j.stock_status, 'available'::text) = 'available'::text))) AS active_stock_count
   FROM dealership_profiles d
  WHERE ((is_public = true) AND (verification_status = 'approved'::text))
AND (EXISTS (SELECT 1 FROM public.public_dealership_profiles visible WHERE visible.id = d.id));

CREATE OR REPLACE VIEW public.loadlink_public_listings AS
SELECT id,
    title,
    city,
    province,
    vehicle_group,
    rate,
    price_amount,
    price_type,
    description,
    photos,
    sponsored,
    poster_photo,
    featured_until,
    view_count,
    sponsor_label,
    sponsored_until,
    package_type,
    created_at,
    updated_at,
    listing_kind,
    lifecycle_status,
    moderation_status,
    stock_status,
    status,
    expires_at,
    vehicle_type,
    vehicle_year,
    brand,
    model,
    body_type,
    transmission,
    fuel_type,
    axle_configuration,
    odometer_km,
    gvm_kg,
    payload_kg,
    condition,
    service_history,
    previous_owners,
    video_url,
    verification_level,
    completion_score,
    document_check_status,
    route_start,
    route_end,
    route_distance_km,
    load_type,
    required_equipment,
    rate_amount,
    rate_unit,
    payment_terms,
    recurrence_type,
    recurrence_until,
    work_starts_at,
    work_ends_at,
    dealership_id,
    posted_by
   FROM job_listings j
  WHERE ((COALESCE(moderation_status, 'approved'::text) = 'approved'::text) AND (COALESCE(lifecycle_status, status, 'active'::text) = 'active'::text) AND (COALESCE(stock_status, 'available'::text) <> ALL (ARRAY['sold'::text, 'archived'::text, 'expired'::text])) AND ((expires_at IS NULL) OR (expires_at > now())))
AND (NOT public.loadlink_marketplace_is_restricted(j.user_id));

CREATE OR REPLACE VIEW public.public_dealership_slug_redirects AS
SELECT h.old_slug,
    p.slug AS current_slug
   FROM (dealership_slug_history h
     JOIN dealership_profiles p ON ((p.id = h.dealership_id)))
  WHERE ((p.verification_status = 'approved'::text) AND (p.platform_status = 'active'::text) AND (p.is_public = true) AND (p.showroom_status = 'live'::text))
AND (EXISTS (SELECT 1 FROM public.public_dealership_profiles visible WHERE visible.id = p.id));

CREATE OR REPLACE VIEW public.public_dealership_statuses AS
SELECT s.id,
    s.dealership_id,
    s.content_type,
    s.title,
    s.body,
    s.media_url,
    s.listing_id,
    s.cta_label,
    s.action_url,
    s.display_seconds,
    s.starts_at,
    s.expires_at,
    s.created_at
   FROM (dealership_statuses s
     JOIN dealership_profiles p ON ((p.id = s.dealership_id)))
  WHERE ((EXISTS ( SELECT 1
           FROM loadlink_feature_flags f
          WHERE ((f.key = 'dealer_status_follower_surface'::text) AND (f.enabled = true)))) AND (s.moderation_status = 'approved'::text) AND (s.publication_status = ANY (ARRAY['ready'::text, 'published'::text])) AND (s.starts_at <= now()) AND (s.expires_at > now()) AND (p.verification_status = 'approved'::text) AND (p.platform_status = 'active'::text) AND (p.is_public = true) AND (p.showroom_status = 'live'::text) AND ((loadlink_dealer_subscription_state(p.owner_user_id) ->> 'status'::text) = ANY (ARRAY['active'::text, 'past_due'::text, 'grace_period'::text])))
AND (EXISTS (SELECT 1 FROM public.public_dealership_profiles visible WHERE visible.id = p.id));

CREATE OR REPLACE VIEW public.public_dealership_updates AS
SELECT u.id,
    u.dealership_id,
    u.update_type,
    u.title,
    u.body,
    u.image_url,
    u.listing_id,
    u.published_at,
    u.created_at
   FROM (dealership_updates u
     JOIN dealership_profiles p ON ((p.id = u.dealership_id)))
  WHERE ((u.status = 'approved'::text) AND (u.publication_status = 'published'::text) AND ((u.expires_at IS NULL) OR (u.expires_at > now())) AND (p.verification_status = 'approved'::text) AND (p.platform_status = 'active'::text) AND (p.is_public = true) AND (p.showroom_status = 'live'::text) AND ((loadlink_dealer_subscription_state(p.owner_user_id) ->> 'status'::text) = ANY (ARRAY['active'::text, 'past_due'::text, 'grace_period'::text])))
AND (EXISTS (SELECT 1 FROM public.public_dealership_profiles visible WHERE visible.id = p.id));

ALTER FUNCTION public.loadlink_dealer_role_permissions(text) SET search_path = pg_catalog;
ALTER FUNCTION public.loadlink_touch_updated_at() SET search_path = pg_catalog;

