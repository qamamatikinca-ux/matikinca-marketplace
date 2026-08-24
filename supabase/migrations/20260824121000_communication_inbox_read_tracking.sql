-- Keep Communication Studio metrics in sync with the existing notification inbox.
-- Reading a Control Centre campaign notification counts as an acknowledgement once.

create or replace function public.loadlink_track_campaign_notification_read()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.type = 'communication_campaign'
     and new.operation_id is not null
     and new.is_read = true
     and coalesce(old.is_read, false) = false
     and exists (
       select 1
       from public.loadlink_communication_campaigns c
       where c.id = new.operation_id
     ) then
    insert into public.loadlink_communication_events(campaign_id, user_id, event_type)
    values (new.operation_id, new.user_id, 'acknowledged')
    on conflict (campaign_id, user_id, event_type) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists loadlink_campaign_notification_read on public.user_notifications;
create trigger loadlink_campaign_notification_read
after update of is_read on public.user_notifications
for each row execute function public.loadlink_track_campaign_notification_read();

revoke execute on function public.loadlink_track_campaign_notification_read() from public, anon, authenticated;
