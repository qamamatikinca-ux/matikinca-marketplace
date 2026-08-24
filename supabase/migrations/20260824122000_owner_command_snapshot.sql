-- Owner Command read model.
-- Aggregates existing operational signals without exposing generic table access to the browser.

create or replace function public.loadlink_owner_command_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  staff_role text := public.loadlink_phase2_admin_role();
  result jsonb;
begin
  if staff_role not in ('owner', 'admin') then
    raise exception 'Owner Command access denied' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'counts', jsonb_build_object(
      'open_tasks', (select count(*) from public.admin_tasks where status not in ('done','completed','closed')),
      'blocked_tasks', (select count(*) from public.admin_tasks where status = 'blocked'),
      'overdue_tasks', (select count(*) from public.admin_tasks where due_at is not null and due_at < now() and status not in ('done','completed','closed')),
      'open_support', (select count(*) from public.support_tickets where status not in ('resolved','closed')),
      'urgent_support', (select count(*) from public.support_tickets where priority in ('urgent','high') and status not in ('resolved','closed')),
      'enabled_flags', (select count(*) from public.loadlink_feature_flags where enabled = true),
      'live_communications', (
        select count(*) from public.loadlink_communication_campaigns c
        where c.status in ('live','scheduled')
          and coalesce(c.starts_at, c.created_at) <= now()
          and (c.ends_at is null or c.ends_at > now())
      ),
      'scheduled_communications', (
        select count(*) from public.loadlink_communication_campaigns c
        where c.status = 'scheduled' and c.starts_at > now()
      ),
      'health_events_24h', (select count(*) from public.platform_health_events where checked_at >= now() - interval '24 hours')
    ),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'department', t.department,
        'priority', t.priority,
        'status', t.status,
        'due_at', t.due_at,
        'sla_due_at', t.sla_due_at,
        'created_at', t.created_at
      ) order by
        case t.priority when 'urgent' then 4 when 'high' then 3 when 'normal' then 2 else 1 end desc,
        case when t.status = 'blocked' then 0 else 1 end,
        coalesce(t.due_at, t.sla_due_at, t.created_at + interval '100 years') asc
      )
      from (
        select * from public.admin_tasks
        where status not in ('done','completed','closed')
        order by created_at desc
        limit 12
      ) t
    ), '[]'::jsonb),
    'support', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'ticket_number', s.ticket_number,
        'subject', s.subject,
        'status', s.status,
        'priority', s.priority,
        'due_at', s.due_at,
        'created_at', s.created_at
      ) order by
        case s.priority when 'urgent' then 4 when 'high' then 3 when 'normal' then 2 else 1 end desc,
        coalesce(s.due_at, s.created_at + interval '100 years') asc
      )
      from (
        select * from public.support_tickets
        where status not in ('resolved','closed')
        order by created_at desc
        limit 10
      ) s
    ), '[]'::jsonb),
    'health', coalesce((
      select jsonb_agg(jsonb_build_object(
        'service', h.service,
        'status', h.status,
        'latency_ms', h.latency_ms,
        'checked_at', h.checked_at
      ) order by h.service)
      from (
        select distinct on (service) service, status, latency_ms, checked_at
        from public.platform_health_events
        order by service, checked_at desc
      ) h
    ), '[]'::jsonb),
    'feature_flags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', f.key,
        'enabled', f.enabled,
        'updated_at', f.updated_at
      ) order by f.key)
      from public.loadlink_feature_flags f
    ), '[]'::jsonb),
    'communications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'status', c.status,
        'audience', c.audience,
        'surface', c.surface,
        'priority', c.priority,
        'starts_at', c.starts_at,
        'ends_at', c.ends_at,
        'updated_at', c.updated_at
      ) order by c.updated_at desc)
      from (
        select * from public.loadlink_communication_campaigns
        where status <> 'archived'
        order by updated_at desc
        limit 8
      ) c
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.loadlink_owner_command_snapshot() from public, anon;
grant execute on function public.loadlink_owner_command_snapshot() to authenticated;
