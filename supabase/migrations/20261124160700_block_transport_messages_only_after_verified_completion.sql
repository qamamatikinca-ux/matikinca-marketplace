-- Completed transport work is read-only. Ordinary back navigation never closes a conversation.
create or replace function public.loadlink_guard_completed_transport_message()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if exists(
  select 1 from public.listing_guest_threads t
   join public.job_closures c on c.listing_id=t.listing_id and c.outcome='completed'
   where t.id=new.thread_id
 ) then
  raise exception 'Completed work is archived in History. This conversation is read-only.';
 end if;
 return new;
end; $$;
drop trigger if exists loadlink_guard_completed_transport_message_insert on public.listing_guest_messages;
create trigger loadlink_guard_completed_transport_message_insert
 before insert on public.listing_guest_messages
 for each row execute function public.loadlink_guard_completed_transport_message();
revoke execute on function public.loadlink_guard_completed_transport_message() from public,anon,authenticated;