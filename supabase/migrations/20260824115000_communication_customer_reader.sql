-- Always return the current customer's targeted, active communication set.
-- This avoids broad staff read policies affecting the customer-facing renderer for staff accounts.

create or replace function public.loadlink_my_active_communications()
returns setof public.loadlink_communication_campaigns
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select c.*
  from public.loadlink_communication_campaigns c
  where auth.uid() is not null
    and c.status in ('live','scheduled')
    and coalesce(c.starts_at, c.created_at) <= now()
    and (c.ends_at is null or c.ends_at > now())
    and public.loadlink_communication_targets_current_user(c.audience)
  order by
    case c.priority when 'urgent' then 3 when 'important' then 2 else 1 end desc,
    c.created_at desc;
$$;

grant execute on function public.loadlink_my_active_communications() to authenticated;
