-- LOADLINK NO-LOGIN LISTING CHAT
-- Run this entire file once in Supabase SQL Editor.
-- It does not require users to create accounts or enable Anonymous Sign-Ins.

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

create table if not exists public.listing_guest_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  buyer_hash text not null,
  buyer_name text not null default 'Interested LoadLink user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_hash)
);

create table if not exists public.listing_guest_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.listing_guest_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer', 'owner')),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists listing_guest_threads_listing_idx
  on public.listing_guest_threads (listing_id, updated_at desc);

create index if not exists listing_guest_messages_thread_idx
  on public.listing_guest_messages (thread_id, created_at);

alter table public.listing_guest_threads enable row level security;
alter table public.listing_guest_messages enable row level security;

drop policy if exists "no direct guest thread access" on public.listing_guest_threads;
create policy "no direct guest thread access"
on public.listing_guest_threads
for all
to public
using (false)
with check (false);

drop policy if exists "no direct guest message access" on public.listing_guest_messages;
create policy "no direct guest message access"
on public.listing_guest_messages
for all
to public
using (false)
with check (false);

create or replace function public.open_listing_guest_chat(
  p_listing_id uuid,
  p_buyer_key text,
  p_buyer_name text default 'Interested LoadLink user'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread_id uuid;
  v_buyer_hash text;
  v_owner_key text;
begin
  if length(coalesce(p_buyer_key, '')) < 20 then
    raise exception 'Chat device key is invalid';
  end if;

  select owner_key
  into v_owner_key
  from public.job_listings
  where id = p_listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;

  if length(coalesce(v_owner_key, '')) < 20 then
    raise exception 'This older listing has no chat key. Use Call or WhatsApp for this listing.';
  end if;

  if v_owner_key = p_buyer_key then
    raise exception 'You cannot message your own listing';
  end if;

  v_buyer_hash := encode(digest(p_buyer_key, 'sha256'), 'hex');

  insert into public.listing_guest_threads (
    listing_id,
    buyer_hash,
    buyer_name,
    updated_at
  )
  values (
    p_listing_id,
    v_buyer_hash,
    coalesce(nullif(trim(p_buyer_name), ''), 'Interested LoadLink user'),
    now()
  )
  on conflict (listing_id, buyer_hash)
  do update set
    buyer_name = excluded.buyer_name,
    updated_at = now()
  returning id into v_thread_id;

  return v_thread_id;
end;
$$;

create or replace function public.get_buyer_guest_threads(p_buyer_key text)
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  other_name text,
  other_phone text,
  last_message text,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.listing_id,
    j.title,
    coalesce(nullif(trim(j.posted_by), ''), 'Listing poster'),
    nullif(trim(j.contact_number), ''),
    last_message.body,
    last_message.created_at
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select body, created_at
    from public.listing_guest_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where t.buyer_hash = encode(digest(coalesce(p_buyer_key, ''), 'sha256'), 'hex')
  order by coalesce(last_message.created_at, t.updated_at) desc;
$$;

create or replace function public.get_owner_guest_threads(p_owner_key text)
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  other_name text,
  other_phone text,
  last_message text,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.listing_id,
    j.title,
    coalesce(nullif(trim(t.buyer_name), ''), 'Interested LoadLink user'),
    null::text,
    last_message.body,
    last_message.created_at
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select body, created_at
    from public.listing_guest_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where j.owner_key = p_owner_key
    and length(coalesce(p_owner_key, '')) >= 20
  order by coalesce(last_message.created_at, t.updated_at) desc;
$$;

create or replace function public.get_listing_guest_messages(
  p_thread_id uuid,
  p_access_key text
)
returns table (
  id uuid,
  sender_role text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
begin
  select (
    t.buyer_hash = encode(digest(coalesce(p_access_key, ''), 'sha256'), 'hex')
    or j.owner_key = p_access_key
  )
  into v_allowed
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  where t.id = p_thread_id;

  if not coalesce(v_allowed, false) then
    raise exception 'You do not have access to this conversation';
  end if;

  return query
  select m.id, m.sender_role, m.body, m.created_at
  from public.listing_guest_messages m
  where m.thread_id = p_thread_id
  order by m.created_at;
end;
$$;

create or replace function public.send_listing_guest_message(
  p_thread_id uuid,
  p_access_key text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_buyer_hash text;
  v_owner_key text;
  v_sender_role text;
  v_message_id uuid;
  v_count integer;
begin
  if length(trim(coalesce(p_body, ''))) < 1 then
    raise exception 'Message cannot be empty';
  end if;

  if char_length(p_body) > 4000 then
    raise exception 'Message is too long';
  end if;

  select t.buyer_hash, j.owner_key
  into v_buyer_hash, v_owner_key
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  where t.id = p_thread_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_buyer_hash = encode(digest(coalesce(p_access_key, ''), 'sha256'), 'hex') then
    v_sender_role := 'buyer';
  elsif v_owner_key = p_access_key then
    v_sender_role := 'owner';
  else
    raise exception 'You do not have access to this conversation';
  end if;

  select count(*)
  into v_count
  from public.listing_guest_messages
  where thread_id = p_thread_id
    and sender_role = v_sender_role
    and created_at >= date_trunc('day', now());

  if v_count >= 50 then
    raise exception 'Daily message limit reached';
  end if;

  insert into public.listing_guest_messages (
    thread_id,
    sender_role,
    body
  )
  values (
    p_thread_id,
    v_sender_role,
    trim(p_body)
  )
  returning id into v_message_id;

  update public.listing_guest_threads
  set updated_at = now()
  where id = p_thread_id;

  return jsonb_build_object(
    'id', v_message_id,
    'remaining', greatest(0, 49 - v_count)
  );
end;
$$;

revoke all on function public.open_listing_guest_chat(uuid, text, text) from public;
revoke all on function public.get_buyer_guest_threads(text) from public;
revoke all on function public.get_owner_guest_threads(text) from public;
revoke all on function public.get_listing_guest_messages(uuid, text) from public;
revoke all on function public.send_listing_guest_message(uuid, text, text) from public;

grant execute on function public.open_listing_guest_chat(uuid, text, text) to anon, authenticated;
grant execute on function public.get_buyer_guest_threads(text) to anon, authenticated;
grant execute on function public.get_owner_guest_threads(text) to anon, authenticated;
grant execute on function public.get_listing_guest_messages(uuid, text) to anon, authenticated;
grant execute on function public.send_listing_guest_message(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
