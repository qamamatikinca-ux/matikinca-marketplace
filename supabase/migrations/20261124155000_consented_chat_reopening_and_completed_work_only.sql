-- Transport conversation closure is separate from exiting a chat.
-- A job/contract may enter verified completion history only after its scheduled date
-- and a positive confirmation from its original poster.
create or replace function public.loadlink_job_closure_snapshot()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare rec record; v_today date := (now() at time zone 'Africa/Johannesburg')::date;
begin
 select j.user_id,j.title,j.listing_kind,j.city,j.rate,j.work_starts_at,j.work_ends_at into rec
 from public.job_listings j where j.id=new.listing_id;
 if not found or rec.user_id is distinct from new.closed_by or new.closed_by is distinct from auth.uid() then
  raise exception 'Only the original poster may confirm completed work';
 end if;
 if new.outcome <> 'completed' then
  raise exception 'Conversations remain active until the poster confirms completed work';
 end if;
 if rec.listing_kind='job' and
   (rec.work_starts_at is null or (rec.work_starts_at at time zone 'Africa/Johannesburg')::date>v_today) then
  raise exception 'Work completion can be confirmed on or after the scheduled job date';
 end if;
 if rec.listing_kind='contract' and
   (coalesce(rec.work_ends_at,rec.work_starts_at) is null or
    (coalesce(rec.work_ends_at,rec.work_starts_at) at time zone 'Africa/Johannesburg')::date>v_today) then
  raise exception 'Work completion can be confirmed after the scheduled contract date';
 end if;
 if new.thread_id is not null and not public.loadlink_is_listing_thread_participant(new.listing_id,new.thread_id,new.closed_by) then
  raise exception 'Conversation does not belong to the original poster';
 end if;
 new.title:=coalesce(rec.title,'');
 new.listing_kind:=coalesce(rec.listing_kind,'job');
 new.city:=coalesce(rec.city,'');
 new.rate:=coalesce(rec.rate,'');
 new.closed_at:=now();
 return new;
end; $$;
revoke execute on function public.loadlink_job_closure_snapshot() from public,anon,authenticated;

alter table public.driver_message_threads add column if not exists reopen_requested_by uuid references auth.users(id);
alter table public.driver_message_threads add column if not exists reopen_requested_at timestamptz;

-- The old 'blocked' flag can indicate an intentional safety decision. Never
-- let one person reverse it alone. Both participants must explicitly consent.
create or replace function public.loadlink_request_reopen_driver_chat(p_thread_id uuid)
returns text language plpgsql security definer set search_path='public','pg_temp' as $$
declare t public.driver_message_threads; v_user uuid:=auth.uid();
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
  raise exception 'Sign in required' using errcode='28000';
 end if;
 select * into t from public.driver_message_threads where id=p_thread_id for update;
 if not found or v_user not in (t.driver_user_id,t.enquirer_user_id) then
  raise exception 'Conversation unavailable' using errcode='42501';
 end if;
 if exists(select 1 from public.user_moderation_profiles where user_id in (t.driver_user_id,t.enquirer_user_id) and status in ('suspended','blocked')) then
  raise exception 'An account is restricted' using errcode='42501';
 end if;
 if not t.blocked then return 'open'; end if;
 if t.reopen_requested_by is not null and t.reopen_requested_by<>v_user
   and t.reopen_requested_at>now()-interval '14 days' then
  update public.driver_message_threads set blocked=false,reopen_requested_by=null,reopen_requested_at=null,updated_at=now()
   where id=t.id;
  return 'reopened';
 end if;
 update public.driver_message_threads set reopen_requested_by=v_user,reopen_requested_at=now() where id=t.id;
 return 'pending';
end; $$;
revoke all on function public.loadlink_request_reopen_driver_chat(uuid) from public,anon;
grant execute on function public.loadlink_request_reopen_driver_chat(uuid) to authenticated;
