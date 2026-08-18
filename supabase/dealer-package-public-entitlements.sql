-- Dealer package public benefits are account entitlements, not per-post flags.
-- Applied to production Supabase on 2026-08-19.

create or replace function public.loadlink_public_dealer_entitlements(p_user_ids uuid[])
returns setof jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'owner_user_id', p.owner_user_id,
    'dealership_id', p.id,
    'dealer_package_active', true,
    'dealership_name', case when p.is_public and p.platform_status='active' then p.name else null end,
    'dealership_slug', case when p.is_public and p.platform_status='active' then p.slug else null end,
    'dealership_logo', case when p.is_public and p.platform_status='active' then p.profile_image_url else null end,
    'dealership_trading_hours', case when p.is_public and p.platform_status='active' then p.trading_hours else null end,
    'dealership_location', case when p.is_public and p.platform_status='active' then p.physical_location else null end,
    'dealership_phone', case when p.is_public and p.platform_status='active' then p.phone_number else null end,
    'verification_status', p.verification_status,
    'public_profile_available', (p.is_public and p.platform_status='active'),
    'verified_dealership', (p.verification_status='approved'),
    'showroom_available', (
      p.is_public and p.platform_status='active' and p.showroom_status='live' and exists(
        select 1 from public.job_listings j
        where (j.dealership_id=p.id or (j.dealership_id is null and j.user_id=p.owner_user_id))
          and j.listing_kind='vehicle'
          and j.moderation_status='approved'
          and j.lifecycle_status='live'
          and coalesce(j.stock_status,'available') in ('available','reserved')
          and (j.expires_at is null or j.expires_at>now())
      )
    ),
    'active_listing_count', (
      select count(*) from public.job_listings j
      where (j.dealership_id=p.id or (j.dealership_id is null and j.user_id=p.owner_user_id))
        and j.listing_kind='vehicle'
        and j.moderation_status='approved'
        and j.lifecycle_status='live'
        and coalesce(j.stock_status,'available') in ('available','reserved')
        and (j.expires_at is null or j.expires_at>now())
    ),
    'review_count', (
      select count(*) from public.dealership_reviews r
      where r.dealership_id=p.id and r.status='approved'
    ),
    'review_average', (
      select round(avg(r.rating)::numeric,1) from public.dealership_reviews r
      where r.dealership_id=p.id and r.status='approved'
    )
  )
  from public.dealership_profiles p
  where p.owner_user_id = any(coalesce(p_user_ids, array[]::uuid[]))
    and (public.loadlink_dealer_subscription_state(p.owner_user_id)->>'status') in ('active','past_due','grace_period');
$$;

grant execute on function public.loadlink_public_dealer_entitlements(uuid[]) to anon, authenticated;

create or replace function public.loadlink_public_dealer_inventory(
  p_dealership_id uuid,
  p_page integer default 1,
  p_page_size integer default 8,
  p_query text default '',
  p_stock text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_page int:=greatest(1,coalesce(p_page,1));
  v_size int:=least(24,greatest(1,coalesce(p_page_size,8)));
  v_total bigint;
  v_items jsonb;
  v_owner uuid;
begin
  select p.owner_user_id into v_owner
  from public.dealership_profiles p
  where p.id=p_dealership_id
    and p.verification_status='approved'
    and p.platform_status='active'
    and p.is_public=true
    and p.showroom_status='live'
    and (public.loadlink_dealer_subscription_state(p.owner_user_id)->>'status') in ('active','past_due','grace_period');

  if v_owner is null then
    return jsonb_build_object('items','[]'::jsonb,'total',0,'page',v_page,'pages',1);
  end if;

  with base as (
    select j.id,j.title,j.city,j.rate,j.price_amount,j.photos,j.stock_status,j.vehicle_year,j.brand,j.model,j.created_at
    from public.job_listings j
    where (j.dealership_id=p_dealership_id or (j.dealership_id is null and j.user_id=v_owner))
      and j.listing_kind='vehicle'
      and j.moderation_status='approved'
      and j.lifecycle_status='live'
      and j.stock_status in ('available','reserved')
      and (j.expires_at is null or j.expires_at>now())
      and (p_stock='all' or j.stock_status=p_stock)
      and (coalesce(p_query,'')='' or j.title ilike '%'||p_query||'%' or coalesce(j.brand,'') ilike '%'||p_query||'%' or coalesce(j.model,'') ilike '%'||p_query||'%')
  ), numbered as (
    select *,count(*) over() total_count from base
  ), page_rows as (
    select * from numbered order by created_at desc offset (v_page-1)*v_size limit v_size
  )
  select coalesce(max(total_count),0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id',id,'title',title,'city',city,'rate',rate,'price_amount',price_amount,'photos',photos,
           'stock_status',stock_status,'vehicle_year',vehicle_year,'brand',brand,'model',model,'created_at',created_at
         ) order by created_at desc),'[]'::jsonb)
    into v_total,v_items from page_rows;

  return jsonb_build_object('items',v_items,'total',v_total,'page',v_page,'pages',greatest(1,ceil(v_total::numeric/v_size)::int));
end
$$;

create or replace view public.public_dealership_profiles as
select
  p.id,
  p.slug,
  p.name,
  p.profile_image_url,
  p.cover_image_url,
  p.short_bio,
  p.business_description,
  p.physical_location,
  p.contact_email,
  p.phone_number,
  p.whatsapp_number,
  p.website_url,
  p.trading_hours,
  p.year_established,
  p.average_response_minutes,
  p.response_rate,
  p.created_at,
  (select count(*) from public.dealership_followers f where f.dealership_id=p.id) as follower_count,
  (select count(*) from public.job_listings j
    where (j.dealership_id=p.id or (j.dealership_id is null and j.user_id=p.owner_user_id))
      and j.listing_kind='vehicle'
      and j.stock_status in ('available','reserved')
      and j.lifecycle_status='live'
      and j.moderation_status='approved'
      and (j.expires_at is null or j.expires_at>now())) as active_listing_count
from public.dealership_profiles p
where p.verification_status='approved'
  and p.platform_status='active'
  and p.is_public=true
  and p.showroom_status='live'
  and (public.loadlink_dealer_subscription_state(p.owner_user_id)->>'status') in ('active','past_due','grace_period');

grant select on public.public_dealership_profiles to anon, authenticated;
