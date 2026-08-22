create unique index if not exists dealership_status_views_user_status_uidx
on public.dealership_status_views(status_id,viewer_user_id)
where viewer_user_id is not null;

create or replace function public.loadlink_my_followed_dealer_updates()
returns jsonb
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  with active as (
    select distinct on (df.dealership_id)
      dp.id as dealership_id,
      dp.slug,
      coalesce(nullif(dp.display_name,''),nullif(dp.name,''),'Dealership') as dealership_name,
      coalesce(nullif(dp.profile_image_url,''),nullif(dp.logo_url,'')) as image_url,
      ds.id as status_id,
      ds.content_type,
      ds.title,
      ds.starts_at,
      ds.expires_at,
      exists(
        select 1 from public.dealership_status_views dsv
        where dsv.status_id=ds.id and dsv.viewer_user_id=auth.uid()
      ) as seen
    from public.dealership_followers df
    join public.dealership_profiles dp on dp.id=df.dealership_id
    join public.dealership_statuses ds on ds.dealership_id=dp.id
    where auth.uid() is not null
      and df.user_id=auth.uid()
      and dp.verification_status='approved'
      and dp.is_public=true
      and coalesce(dp.platform_status,'active')='active'
      and coalesce(dp.showroom_status,'live')='live'
      and ds.moderation_status='approved'
      and ds.publication_status='published'
      and ds.starts_at<=now()
      and ds.expires_at>now()
    order by df.dealership_id, ds.starts_at desc, ds.created_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'dealership_id',dealership_id,
    'slug',slug,
    'dealership_name',dealership_name,
    'image_url',image_url,
    'status_id',status_id,
    'content_type',content_type,
    'title',title,
    'seen',seen,
    'starts_at',starts_at,
    'expires_at',expires_at
  ) order by seen asc, starts_at desc),'[]'::jsonb)
  from active;
$$;
revoke all on function public.loadlink_my_followed_dealer_updates() from public, anon;
grant execute on function public.loadlink_my_followed_dealer_updates() to authenticated, service_role;

create or replace function public.loadlink_mark_followed_dealer_status_seen(p_status_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_user uuid:=auth.uid();
  v_dealer uuid;
begin
  if v_user is null or p_status_id is null then return false; end if;

  select ds.dealership_id into v_dealer
  from public.dealership_statuses ds
  join public.dealership_profiles dp on dp.id=ds.dealership_id
  where ds.id=p_status_id
    and ds.moderation_status='approved'
    and ds.publication_status='published'
    and ds.starts_at<=now()
    and ds.expires_at>now()
    and dp.verification_status='approved'
    and dp.is_public=true
    and coalesce(dp.platform_status,'active')='active'
    and coalesce(dp.showroom_status,'live')='live'
    and exists(
      select 1 from public.dealership_followers df
      where df.dealership_id=ds.dealership_id and df.user_id=v_user
    );

  if v_dealer is null then return false; end if;

  insert into public.dealership_status_views(
    status_id,viewer_user_id,viewer_hash,watch_seconds,completed,vehicle_opened,message_sent,viewed_at
  ) values (p_status_id,v_user,null,0,false,false,false,now())
  on conflict (status_id,viewer_user_id) where viewer_user_id is not null
  do update set viewed_at=excluded.viewed_at;

  return true;
end;
$$;
revoke all on function public.loadlink_mark_followed_dealer_status_seen(uuid) from public, anon;
grant execute on function public.loadlink_mark_followed_dealer_status_seen(uuid) to authenticated, service_role;
