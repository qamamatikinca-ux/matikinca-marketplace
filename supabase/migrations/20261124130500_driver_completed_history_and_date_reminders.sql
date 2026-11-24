-- Use the South African calendar date, not time-of-day, for "needed on" completion reminders.
drop policy if exists "Only listing poster closes its job" on public.job_closures;
create policy "Only listing poster closes its job" on public.job_closures for insert to authenticated with check (
 closed_by=(select auth.uid())
 and exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=(select auth.uid())
  and j.listing_kind in ('job','contract'))
 and (
  (thread_id is not null and public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid())))
  or
  (thread_id is null and exists (
   select 1 from public.job_listings j where j.id=listing_id and
    ((j.listing_kind='job' and j.work_starts_at is not null
      and (j.work_starts_at at time zone 'Africa/Johannesburg')::date<=(now() at time zone 'Africa/Johannesburg')::date)
    or (j.listing_kind='contract' and j.work_ends_at is not null
      and (j.work_ends_at at time zone 'Africa/Johannesburg')::date<=(now() at time zone 'Africa/Johannesburg')::date))
  ))
 )
);

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
 elsif not ((rec.listing_kind='job' and rec.work_starts_at is not null
      and (rec.work_starts_at at time zone 'Africa/Johannesburg')::date<=(now() at time zone 'Africa/Johannesburg')::date)
   or (rec.listing_kind='contract' and rec.work_ends_at is not null
      and (rec.work_ends_at at time zone 'Africa/Johannesburg')::date<=(now() at time zone 'Africa/Johannesburg')::date)) then
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

-- Only assigned drivers can see their own verified completed work in Driver History.
create or replace function public.loadlink_my_driver_completed_jobs()
returns table(assignment_id uuid,listing_id uuid,job_title text,listing_kind text,closed_at timestamptz,rating numeric)
language sql stable security definer set search_path='public','pg_temp' as $$
 select distinct on (a.listing_id)
  a.id,c.listing_id,c.title,c.listing_kind,c.closed_at,f.rating::numeric
 from public.job_driver_assignments a
 join public.job_closures c on c.listing_id=a.listing_id and c.outcome='completed'
 left join public.driver_completion_feedback f on f.listing_id=a.listing_id and f.driver_profile_id=a.driver_profile_id
 where (select auth.uid()) is not null and a.driver_user_id=(select auth.uid())
  and a.status in ('accepted','in_transit','delivery_reported','completed')
 order by a.listing_id,c.closed_at desc;
$$;
revoke all on function public.loadlink_my_driver_completed_jobs() from public,anon;
grant execute on function public.loadlink_my_driver_completed_jobs() to authenticated;
