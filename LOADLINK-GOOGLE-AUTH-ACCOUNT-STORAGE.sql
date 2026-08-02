-- LOADLINK GOOGLE AUTH + ACCOUNT STORAGE UPGRADE
-- Safe, additive migration. It does NOT delete listings, messages, profiles or files.
-- Run this once in Supabase SQL Editor after the existing LoadLink chat SQL files.

create extension if not exists pgcrypto;

grant usage on schema public to authenticated;

-- Keep the existing listings table and add only the ownership columns required
-- by signed-in posting. Existing rows and photos are not changed or recreated.
alter table if exists public.job_listings
  add column if not exists owner_key text not null default '',
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists job_listings_user_id_idx
  on public.job_listings(user_id);

-- Enforce a real Supabase account for new browser/API listing inserts. Existing
-- listings stay untouched. SQL Editor/service operations without a user JWT are
-- left available for administration and recovery work.
create or replace function public.require_signed_in_listing_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := auth.role();
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if v_role is not null and (auth.uid() is null or v_is_anonymous) then
    raise exception 'Sign in with a real account before posting';
  end if;

  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists loadlink_require_signed_in_listing_owner on public.job_listings;
create trigger loadlink_require_signed_in_listing_owner
before insert on public.job_listings
for each row execute function public.require_signed_in_listing_owner();

-- Stores the existing private device/chat keys and recent activity against the
-- signed-in Google account. Existing guest-key chat tables remain untouched.
create table if not exists public.user_account_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  buyer_keys text[] not null default '{}'::text[],
  owned_job_keys jsonb not null default '{}'::jsonb,
  recent_viewed jsonb not null default '[]'::jsonb,
  recent_portals jsonb not null default '[]'::jsonb,
  liked_listings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_account_state enable row level security;

drop policy if exists "users read own account state" on public.user_account_state;
create policy "users read own account state"
on public.user_account_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert own account state" on public.user_account_state;
create policy "users insert own account state"
on public.user_account_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users update own account state" on public.user_account_state;
create policy "users update own account state"
on public.user_account_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.user_account_state to authenticated;

-- Append-only signed-in website activity. This records page views, listing
-- views/likes/posts, conversations opened and messages sent.
create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  entity_type text not null default 'website',
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_user_created_idx
  on public.user_activity_events(user_id, created_at desc);

alter table public.user_activity_events enable row level security;

drop policy if exists "users read own activity" on public.user_activity_events;
create policy "users read own activity"
on public.user_activity_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert own activity" on public.user_activity_events;
create policy "users insert own activity"
on public.user_activity_events
for insert
to authenticated
with check (auth.uid() = user_id);

grant select, insert on public.user_activity_events to authenticated;

-- Reconnect listings created before Google login. The long private owner key is
-- proof of ownership. No listing is deleted or recreated.
create or replace function public.claim_guest_listings(p_owner_key text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'A real account is required';
  end if;

  if length(coalesce(p_owner_key, '')) < 20 then
    raise exception 'Invalid owner key';
  end if;

  update public.job_listings
  set user_id = auth.uid()
  where owner_key = p_owner_key
    and user_id is distinct from auth.uid();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_guest_listings(text) from public;
grant execute on function public.claim_guest_listings(text) to authenticated;

-- Optional convenience view for the signed-in user's latest activity.
create or replace view public.my_recent_activity
with (security_invoker = true)
as
select id, activity_type, entity_type, entity_id, metadata, created_at
from public.user_activity_events
where user_id = auth.uid()
order by created_at desc;

grant select on public.my_recent_activity to authenticated;
