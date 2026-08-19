create or replace function public.get_public_job_listings()
returns setof public.job_listings
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select *
  from public.job_listings j
  where j.moderation_status='approved'
    and coalesce(j.status,'active')='active'
    and (j.expires_at is null or j.expires_at>now())
    and coalesce(j.stock_status,'available')<>'removed'
    and not public.loadlink_marketplace_is_restricted(j.user_id)
  order by j.created_at desc nulls last;
$$;

drop policy if exists "loadlink_jobs_read_public_or_own_v266" on public.job_listings;
create policy "loadlink_jobs_read_public_or_own_v266"
on public.job_listings
for select
to anon,authenticated
using (((coalesce(status,'active')='active' and coalesce(moderation_status,'pending')='approved' and (expires_at is null or expires_at>now()) and coalesce(stock_status,'available')<>'removed' and not public.loadlink_marketplace_is_restricted(user_id))) or user_id=auth.uid());

create or replace view public.loadlink_public_driver_profiles as
select d.id,d.full_name,d.profile_image_url,d.headline,d.city,d.province,d.years_experience,d.licence_code,d.vehicle_types,d.route_experience,d.languages,d.availability,d.bio,d.verification_level,d.profile_views,d.created_at,d.updated_at
from public.driver_profiles d
where d.status='approved' and not public.loadlink_marketplace_is_restricted(d.user_id);

create or replace view public.public_dealership_profiles as
select
  p.id,p.slug,p.name,p.profile_image_url,p.cover_image_url,p.short_bio,p.business_description,p.physical_location,p.contact_email,p.phone_number,p.whatsapp_number,p.website_url,p.trading_hours,p.year_established,p.average_response_minutes,p.response_rate,p.created_at,
  (select count(*) from public.dealership_followers f where f.dealership_id=p.id) as follower_count,
  (select count(*) from public.job_listings j where (j.dealership_id=p.id or (j.dealership_id is null and j.user_id=p.owner_user_id)) and j.listing_kind='vehicle' and j.stock_status in ('available','reserved') and j.lifecycle_status='live' and j.moderation_status='approved' and (j.expires_at is null or j.expires_at>now()) and not public.loadlink_marketplace_is_restricted(j.user_id)) as active_listing_count
from public.dealership_profiles p
where p.verification_status='approved'
  and p.platform_status='active'
  and p.is_public=true
  and p.showroom_status='live'
  and not public.loadlink_marketplace_is_restricted(p.owner_user_id)
  and (public.loadlink_dealer_subscription_state(p.owner_user_id)->>'status') in ('active','past_due','grace_period');
