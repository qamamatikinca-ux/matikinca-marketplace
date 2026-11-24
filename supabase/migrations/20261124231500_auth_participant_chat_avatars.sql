-- Only signed-in conversation participants may resolve their counterpart's
-- existing profile image. Do not fabricate, publish, or duplicate private media.
create or replace function public.loadlink_my_message_avatars()
returns table(thread_id uuid, conversation_kind text, avatar_url text)
language sql stable security definer set search_path='public','pg_temp' as $$
 with viewer as (select auth.uid() as uid)
 select t.id,'listing'::text,
   case when j.user_id=v.uid
      then coalesce(nullif(trim(bp.avatar_url),''),nullif(trim(t.buyer_photo),''))
      else coalesce(nullif(trim(op.avatar_url),''),nullif(trim(j.poster_photo),''))
   end as avatar_url
 from public.listing_guest_threads t
 join public.job_listings j on j.id=t.listing_id
 cross join viewer v
 left join public.profiles bp on bp.id=t.buyer_user_id
 left join public.profiles op on op.id=j.user_id
 where v.uid is not null and (t.buyer_user_id=v.uid or j.user_id=v.uid)
 union all
 select t.id,'driver'::text,
   case when t.driver_user_id=v.uid
     then nullif(trim(ep.avatar_url),'')
     else coalesce(nullif(trim(dp.profile_image_url),''),nullif(trim(dr.avatar_url),''))
   end as avatar_url
 from public.driver_message_threads t
 cross join viewer v
 left join public.profiles ep on ep.id=t.enquirer_user_id
 left join public.driver_profiles dp on dp.id=t.driver_profile_id and dp.user_id=t.driver_user_id
 left join public.profiles dr on dr.id=t.driver_user_id
 where v.uid is not null and v.uid in (t.enquirer_user_id,t.driver_user_id);
$$;
revoke all on function public.loadlink_my_message_avatars() from public,anon;
grant execute on function public.loadlink_my_message_avatars() to authenticated;