-- LoadLink Phase 1 Smart Foundation
-- Additive migration only. It does not delete or rename existing data.

create table if not exists public.platform_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 2 and 80),
  entity_type text,
  entity_id text,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_activity_events_user_created_idx
  on public.platform_activity_events (user_id, created_at desc);
create index if not exists platform_activity_events_entity_idx
  on public.platform_activity_events (entity_type, entity_id);

alter table public.platform_activity_events enable row level security;

drop policy if exists "activity owners can read" on public.platform_activity_events;
create policy "activity owners can read" on public.platform_activity_events
for select to authenticated using (auth.uid() = user_id);

-- Writes should come from trusted server-side functions or service-role operations.
-- This prevents users from fabricating approval, payment or verification activity.

grant select on public.platform_activity_events to authenticated;

-- Safe performance indexes for common existing tables. Statements are conditional.
do $$
begin
  if to_regclass('public.job_listings') is not null then
    execute 'create index if not exists job_listings_status_created_idx on public.job_listings (status, created_at desc)';
  end if;
  if to_regclass('public.notifications') is not null then
    execute 'create index if not exists notifications_user_read_created_idx on public.notifications (user_id, is_read, created_at desc)';
  end if;
  if to_regclass('public.messages') is not null then
    execute 'create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc)';
  end if;
end $$;
