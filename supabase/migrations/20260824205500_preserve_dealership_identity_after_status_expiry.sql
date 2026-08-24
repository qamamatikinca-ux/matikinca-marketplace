-- Keep dealership identity available after a temporary status expires.
-- The active status is optional; the dealership/profile relationship is permanent.

create or replace function public.loadlink_chat_dealer_status(p_thread_id uuid)
returns table(
  dealership_id uuid,
  slug text,
  dealership_name text,
  image_url text,
  status_id uuid,
  status_title text
)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  return query
  select
    d.id,
    d.slug,
    coalesce(nullif(trim(d.name), ''), nullif(trim(d.display_name), ''), 'Dealership')::text,
    coalesce(nullif(trim(d.profile_image_url), ''), nullif(trim(d.logo_url), ''))::text,
    s.id,
    s.title
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  join public.dealership_profiles d on d.id = j.dealership_id
  left join lateral (
    select ds.id, ds.title
    from public.dealership_statuses ds
    where ds.dealership_id = d.id
      and lower(coalesce(ds.moderation_status, 'approved')) = 'approved'
      and lower(coalesce(ds.publication_status, 'published')) = 'published'
      and coalesce(ds.starts_at, ds.created_at) <= now()
      and (ds.expires_at is null or ds.expires_at > now())
    order by coalesce(ds.starts_at, ds.created_at) desc
    limit 1
  ) s on true
  where t.id = p_thread_id
    and (
      t.buyer_user_id = v_uid
      or j.user_id = v_uid
      or d.owner_user_id = v_uid
      or exists (
        select 1
        from public.dealership_staff staff
        where staff.dealership_id = d.id
          and staff.user_id = v_uid
          and coalesce(staff.is_active, true)
      )
    )
  limit 1;
end;
$function$;
