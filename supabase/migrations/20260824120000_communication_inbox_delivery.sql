-- Materialise inbox-style campaigns lazily for the signed-in customer.
-- No broad fan-out job and no client insert privilege is required.

create unique index if not exists user_notifications_communication_campaign_unique
  on public.user_notifications (user_id, operation_id)
  where type = 'communication_campaign' and operation_id is not null;

create or replace function public.loadlink_sync_my_campaign_notifications()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  insert into public.user_notifications (
    user_id,
    type,
    title,
    message,
    body,
    action_url,
    metadata,
    operation_id
  )
  select
    auth.uid(),
    'communication_campaign',
    c.title,
    c.message,
    c.message,
    c.cta_url,
    jsonb_build_object(
      'campaign_id', c.id,
      'priority', c.priority,
      'accent_color', c.accent_color,
      'source', 'control_centre'
    ),
    c.id
  from public.loadlink_communication_campaigns c
  where c.surface = 'inbox'
    and c.status in ('live','scheduled')
    and coalesce(c.starts_at, c.created_at) <= now()
    and (c.ends_at is null or c.ends_at > now())
    and public.loadlink_communication_targets_current_user(c.audience)
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke execute on function public.loadlink_sync_my_campaign_notifications() from public, anon;
grant execute on function public.loadlink_sync_my_campaign_notifications() to authenticated;
