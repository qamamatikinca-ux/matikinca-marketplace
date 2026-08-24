-- LoadLink Control Centre: customer communications campaign engine
-- Additive and inert until a campaign is explicitly published by authorised staff.

create table if not exists public.loadlink_communication_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 90),
  message text not null check (char_length(trim(message)) between 1 and 800),
  status text not null default 'draft' check (status in ('draft','scheduled','live','paused','archived')),
  audience text not null default 'all' check (audience in ('all','drivers','dealerships','pro','dealer')),
  surface text not null default 'banner' check (surface in ('banner','toast','modal','inbox')),
  position text not null default 'top' check (position in ('top','bottom','top-left','top-right','bottom-left','bottom-right','center')),
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  background_color text not null default '#111111' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#FFFFFF' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#F6B800' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  starts_at timestamptz,
  ends_at timestamptz,
  dismissible boolean not null default true,
  acknowledgement_required boolean not null default false,
  cta_label text check (cta_label is null or char_length(trim(cta_label)) between 1 and 40),
  cta_url text check (cta_url is null or cta_url ~ '^/[A-Za-z0-9/_?=&%#.-]*$'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loadlink_communication_window_valid check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint loadlink_communication_ack_behavior check (not acknowledgement_required or not dismissible)
);

create table if not exists public.loadlink_communication_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.loadlink_communication_campaigns(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('viewed','dismissed','acknowledged','cta_clicked')),
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id, event_type)
);

create index if not exists loadlink_communication_campaigns_active_idx
  on public.loadlink_communication_campaigns (status, starts_at, ends_at, priority, created_at desc);
create index if not exists loadlink_communication_events_campaign_idx
  on public.loadlink_communication_events (campaign_id, event_type);
create index if not exists loadlink_communication_events_user_idx
  on public.loadlink_communication_events (user_id, campaign_id);

create or replace function public.loadlink_can_manage_communications()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    public.loadlink_is_trusted_server()
    or public.loadlink_phase2_admin_role() in ('owner','admin')
    or exists (
      select 1
      from public.staff_roles sr
      left join public.admin_users au on au.user_id = sr.user_id
      where sr.user_id = auth.uid()
        and sr.active = true
        and (
          lower(sr.role) = 'operations'
          or sr.permissions && array['marketing','campaign_reporting','customer_communications']::text[]
        )
        and (au.user_id is null or (au.is_active = true and coalesce(au.employment_status,'active') = 'active'))
    );
$$;

create or replace function public.loadlink_communication_targets_current_user(target_audience text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and (
    target_audience = 'all'
    or (target_audience = 'drivers' and exists (
      select 1 from public.driver_profiles dp where dp.user_id = auth.uid()
    ))
    or (target_audience = 'dealerships' and exists (
      select 1 from public.dealership_profiles d where d.owner_user_id = auth.uid()
    ))
    or (target_audience = 'pro' and exists (
      select 1 from public.profiles p where p.id = auth.uid() and lower(p.subscription_plan) = 'pro'
    ))
    or (target_audience = 'dealer' and exists (
      select 1 from public.profiles p where p.id = auth.uid() and lower(p.subscription_plan) = 'dealer'
    ))
  );
$$;

create or replace function public.loadlink_admin_communication_audience_counts()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case when public.loadlink_can_manage_communications() then jsonb_build_object(
    'all', (select count(*) from public.profiles),
    'drivers', (select count(distinct dp.user_id) from public.driver_profiles dp),
    'dealerships', (select count(distinct d.owner_user_id) from public.dealership_profiles d),
    'pro', (select count(*) from public.profiles p where lower(p.subscription_plan) = 'pro'),
    'dealer', (select count(*) from public.profiles p where lower(p.subscription_plan) = 'dealer')
  ) else '{}'::jsonb end;
$$;

create or replace function public.loadlink_audit_communication_campaign()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.admin_audit_trail(actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    case when tg_op = 'INSERT' then 'communication_campaign_created' else 'communication_campaign_updated' end,
    'communication_campaign',
    new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists loadlink_communication_campaign_touch on public.loadlink_communication_campaigns;
create trigger loadlink_communication_campaign_touch
before update on public.loadlink_communication_campaigns
for each row execute function public.loadlink_touch_updated_at();

drop trigger if exists loadlink_communication_campaign_audit on public.loadlink_communication_campaigns;
create trigger loadlink_communication_campaign_audit
after insert or update on public.loadlink_communication_campaigns
for each row execute function public.loadlink_audit_communication_campaign();

alter table public.loadlink_communication_campaigns enable row level security;
alter table public.loadlink_communication_events enable row level security;

drop policy if exists loadlink_communication_campaigns_staff_read on public.loadlink_communication_campaigns;
create policy loadlink_communication_campaigns_staff_read
on public.loadlink_communication_campaigns for select
to authenticated
using (public.loadlink_can_manage_communications());

drop policy if exists loadlink_communication_campaigns_customer_read on public.loadlink_communication_campaigns;
create policy loadlink_communication_campaigns_customer_read
on public.loadlink_communication_campaigns for select
to authenticated
using (
  status in ('live','scheduled')
  and coalesce(starts_at, created_at) <= now()
  and (ends_at is null or ends_at > now())
  and public.loadlink_communication_targets_current_user(audience)
);

drop policy if exists loadlink_communication_campaigns_staff_insert on public.loadlink_communication_campaigns;
create policy loadlink_communication_campaigns_staff_insert
on public.loadlink_communication_campaigns for insert
to authenticated
with check (
  public.loadlink_can_manage_communications()
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists loadlink_communication_campaigns_staff_update on public.loadlink_communication_campaigns;
create policy loadlink_communication_campaigns_staff_update
on public.loadlink_communication_campaigns for update
to authenticated
using (public.loadlink_can_manage_communications())
with check (public.loadlink_can_manage_communications() and updated_by = auth.uid());

drop policy if exists loadlink_communication_events_own_read on public.loadlink_communication_events;
create policy loadlink_communication_events_own_read
on public.loadlink_communication_events for select
to authenticated
using (user_id = auth.uid() or public.loadlink_can_manage_communications());

drop policy if exists loadlink_communication_events_own_insert on public.loadlink_communication_events;
create policy loadlink_communication_events_own_insert
on public.loadlink_communication_events for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.loadlink_communication_campaigns c
    where c.id = campaign_id
      and c.status in ('live','scheduled')
      and coalesce(c.starts_at, c.created_at) <= now()
      and (c.ends_at is null or c.ends_at > now())
      and public.loadlink_communication_targets_current_user(c.audience)
  )
);

grant select, insert, update on public.loadlink_communication_campaigns to authenticated;
grant select, insert on public.loadlink_communication_events to authenticated;
grant execute on function public.loadlink_can_manage_communications() to authenticated;
grant execute on function public.loadlink_communication_targets_current_user(text) to authenticated;
grant execute on function public.loadlink_admin_communication_audience_counts() to authenticated;
revoke execute on function public.loadlink_audit_communication_campaign() from public, anon, authenticated;

comment on table public.loadlink_communication_campaigns is 'Control Centre-managed in-app customer communications and presentation configuration.';
comment on table public.loadlink_communication_events is 'Per-user communication interaction telemetry; one row per event type per campaign.';
