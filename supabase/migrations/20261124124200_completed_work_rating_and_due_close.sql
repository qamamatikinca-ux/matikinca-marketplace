-- LoadLink: poster-confirmed completed jobs drive public driver credibility.
-- Owners can close a due job without a chat; only real accepted driver assignments count.
alter table public.job_closures alter column thread_id drop not null;
drop policy if exists "Only listing poster closes its job" on public.job_closures;
create policy "Only listing poster closes its job" on public.job_closures for insert to authenticated
with check(
 closed_by=(select auth.uid())
 and exists (
  select 1 from public.job_listings j where j.id=listing_id
   and j.user_id=(select auth.uid()) and j.listing_kind in ('job','contract')
 )
 and (
  (thread_id is not null and public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid())))
  or
  (thread_id is null and exists (
    select 1 from public.job_listings j where j.id=listing_id and
      ((j.listing_kind='job' and j.work_starts_at is not null and j.work_starts_at<=now())
       or (j.listing_kind='contract' and j.work_ends_at is not null and j.work_ends_at<=now()))
  ))
 )
);
drop policy if exists "Posters and closure chat participants read history" on public.job_closures;
create policy "Posters and closure chat participants read history" on public.job_closures for select to authenticated
 using (closed_by=(select auth.uid()) or (thread_id is not null and public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid()))));

create or replace function public.loadlink_job_closure_snapshot()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare rec record;
begin
 select j.user_id,j.title,j.listing_kind,j.city,j.rate,j.work_starts_at,j.work_ends_at into rec
 from public.job_listings j where j.id=new.listing_id;
 if not found or rec.user_id is distinct from new.closed_by or new.closed_by is distinct from (select auth.uid()) then
  raise exception 'Only the original poster may close a listing';
 end if;
 if new.thread_id is not null then
   if not public.loadlink_is_listing_thread_participant(new.listing_id,new.thread_id,new.closed_by) then
    raise exception 'Conversation does not belong to poster';
   end if;
 elsif not ((rec.listing_kind='job' and rec.work_starts_at is not null and rec.work_starts_at<=now())
     or (rec.listing_kind='contract' and rec.work_ends_at is not null and rec.work_ends_at<=now())) then
   raise exception 'Work completion reminder is not yet due';
 end if;
 new.title:=coalesce(rec.title,'');
 new.listing_kind:=coalesce(rec.listing_kind,'job');
 new.city:=coalesce(rec.city,'');
 new.rate:=coalesce(rec.rate,'');
 new.closed_at:=now();
 return new;
end; $$;
revoke execute on function public.loadlink_job_closure_snapshot() from public,anon,authenticated;

create table if not exists public.driver_completion_feedback (
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.job_listings(id) on delete cascade,
 assignment_id uuid not null unique references public.job_driver_assignments(id) on delete cascade,
 driver_profile_id uuid not null references public.driver_profiles(id) on delete cascade,
 poster_user_id uuid not null references auth.users(id),
 rating smallint not null check (rating between 1 and 5),
 note text not null default '' check(char_length(note)<=1500),
 created_at timestamptz not null default now(),
 unique(listing_id,driver_profile_id)
);
create index if not exists driver_completion_feedback_driver_idx on public.driver_completion_feedback(driver_profile_id,created_at desc);
alter table public.driver_completion_feedback enable row level security;
revoke all on public.driver_completion_feedback from anon,authenticated;
grant select,insert on public.driver_completion_feedback to authenticated;
create policy "Only poster and assigned driver read completion feedback"
 on public.driver_completion_feedback for select to authenticated using(
 poster_user_id=(select auth.uid()) or exists(
  select 1 from public.driver_profiles d where d.id=driver_profile_id and d.user_id=(select auth.uid())
 )
);
create policy "Only completed work poster rates assigned driver"
 on public.driver_completion_feedback for insert to authenticated with check (
  poster_user_id=(select auth.uid())
  and exists(select 1 from public.job_closures c where c.listing_id=driver_completion_feedback.listing_id
    and c.closed_by=(select auth.uid()) and c.outcome='completed')
  and exists(select 1 from public.job_driver_assignments a where a.id=assignment_id
    and a.listing_id=driver_completion_feedback.listing_id and a.driver_profile_id=driver_completion_feedback.driver_profile_id
    and a.status in ('accepted','in_transit','delivery_reported','completed'))
 );
create or replace function public.loadlink_guard_driver_completion_feedback()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if new.poster_user_id is distinct from (select auth.uid()) then raise exception 'Only original job poster may rate';end if;
 if not exists (
  select 1 from public.job_closures c join public.job_listings j on j.id=c.listing_id
   join public.job_driver_assignments a on a.listing_id=c.listing_id
   where c.listing_id=new.listing_id and c.closed_by=new.poster_user_id and c.outcome='completed'
    and j.user_id=new.poster_user_id and a.id=new.assignment_id
    and a.driver_profile_id=new.driver_profile_id and a.status in('accepted','in_transit','delivery_reported','completed')
 ) then
   raise exception 'Rating requires a completed job and an accepted driver assignment';
 end if;
 new.created_at:=now();
 return new;
end; $$;
drop trigger if exists driver_completion_feedback_guard on public.driver_completion_feedback;
create trigger driver_completion_feedback_guard before insert on public.driver_completion_feedback
 for each row execute function public.loadlink_guard_driver_completion_feedback();
revoke execute on function public.loadlink_guard_driver_completion_feedback() from public,anon,authenticated;

-- Keep the public approved-driver search contract unchanged, but replace
-- arbitrary open reviews with verified completed-work counts and ratings.
create or replace function public.loadlink_public_driver_profiles(
 p_limit integer default 8,p_offset integer default 0,p_city text default null,p_search text default null)
returns table(
 id uuid,user_id uuid,full_name text,profile_image_url text,headline text,
 city text,province text,years_experience integer,licence_code text,
 vehicle_types text[],bio text,availability text,verification_level text,
 average_rating numeric,review_count bigint,total_count bigint
)
language sql stable security definer set search_path='public','pg_temp' as $$
 select p.id,p.user_id,p.full_name,p.profile_image_url,p.headline,p.city,p.province,p.years_experience,
  p.licence_code,p.vehicle_types,p.bio,p.availability,p.verification_level,
  coalesce(r.average_rating,0)::numeric,coalesce(r.completed_jobs,0)::bigint,count(*) over()::bigint
 from public.driver_profiles p
 left join lateral (
  select round(avg(f.rating)::numeric,1) as average_rating,count(distinct a.listing_id)::bigint as completed_jobs
  from public.job_driver_assignments a
  join public.job_closures c on c.listing_id=a.listing_id and c.outcome='completed'
  left join public.driver_completion_feedback f on f.assignment_id=a.id
  where a.driver_profile_id=p.id and a.status in('accepted','in_transit','delivery_reported','completed')
 ) r on true
 where p.status='approved'
  and (p.profile_expires_at is null or p.profile_expires_at>now())
  and (nullif(trim(coalesce(p_city,'')),'') is null or p.city ilike '%'||trim(p_city)||'%')
  and (nullif(trim(coalesce(p_search,'')),'') is null or
    concat_ws(' ',p.full_name,p.headline,p.city,p.province,p.licence_code,array_to_string(p.vehicle_types,' '),p.bio)
    ilike '%'||trim(p_search)||'%')
 order by p.approved_at desc nulls last,p.updated_at desc
 limit greatest(1,least(coalesce(p_limit,8),50))
 offset greatest(coalesce(p_offset,0),0);
$$;
