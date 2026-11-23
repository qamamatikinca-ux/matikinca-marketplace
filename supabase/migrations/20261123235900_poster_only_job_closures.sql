-- LoadLink closure history: only the original listing poster may close an existing conversation.
-- Closure records are accessible to the poster and to participants in that specific conversation.
create table if not exists public.job_closures (
  listing_id uuid primary key references public.job_listings(id) on delete cascade,
  thread_id uuid not null references public.listing_guest_threads(id),
  closed_by uuid not null references auth.users(id),
  outcome text not null check (outcome in ('completed','cancelled','no_agreement')),
  note text not null default '' check (char_length(note)<=1500),
  title text not null default '',
  listing_kind text not null default 'job',
  city text not null default '',
  rate text not null default '',
  closed_at timestamptz not null default now()
);
create index if not exists job_closures_closed_by_idx on public.job_closures(closed_by,closed_at desc);
alter table public.job_closures enable row level security;
grant select,insert on public.job_closures to authenticated;
revoke update,delete on public.job_closures from authenticated;
drop policy if exists "Posters and closure chat participants read history" on public.job_closures;
create policy "Posters and closure chat participants read history"
 on public.job_closures for select to authenticated
 using (closed_by=(select auth.uid()) or public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid())));
drop policy if exists "Only listing poster closes its job" on public.job_closures;
create policy "Only listing poster closes its job"
 on public.job_closures for insert to authenticated
 with check (
  closed_by=(select auth.uid())
  and exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=(select auth.uid()) and j.listing_kind in ('job','contract'))
  and public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid()))
 );
create or replace function public.loadlink_job_closure_snapshot()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare rec record;
begin
 select j.user_id,j.title,j.listing_kind,j.city,j.rate into rec from public.job_listings j where j.id=new.listing_id;
 if not found or rec.user_id is distinct from new.closed_by or new.closed_by is distinct from (select auth.uid()) then
  raise exception 'Only the original poster can close this listing';
 end if;
 if not public.loadlink_is_listing_thread_participant(new.listing_id,new.thread_id,new.closed_by) then
  raise exception 'The conversation does not belong to this poster';
 end if;
 new.title:=coalesce(rec.title,'');
 new.listing_kind:=coalesce(rec.listing_kind,'job');
 new.city:=coalesce(rec.city,'');
 new.rate:=coalesce(rec.rate,'');
 new.closed_at:=now();
 return new;
end; $$;
drop trigger if exists job_closure_snapshot_before_insert on public.job_closures;
create trigger job_closure_snapshot_before_insert before insert on public.job_closures
 for each row execute function public.loadlink_job_closure_snapshot();
create or replace function public.loadlink_archive_closed_job()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 update public.job_listings
 set status='closed', lifecycle_status=case when new.outcome='completed' then 'completed' else 'cancelled' end
 where id=new.listing_id and user_id=new.closed_by;
 return new;
end; $$;
drop trigger if exists job_closure_archive_after_insert on public.job_closures;
create trigger job_closure_archive_after_insert after insert on public.job_closures
 for each row execute function public.loadlink_archive_closed_job();
revoke execute on function public.loadlink_job_closure_snapshot() from public,anon,authenticated;
revoke execute on function public.loadlink_archive_closed_job() from public,anon,authenticated;
