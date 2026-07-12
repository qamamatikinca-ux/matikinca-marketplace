-- LOADLINK EXPERIENCE UPGRADE V2
-- Run this entire file in Supabase SQL Editor after the earlier LoadLink chat SQL.
-- Safe to run again. It adds profile photos, a 50-message daily free limit,
-- Pro-plan recognition, and the richer conversation data used by the new chat page.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. PROFILE AND PLAN DATA
-- -----------------------------------------------------------------------------

alter table public.job_listings
  add column if not exists poster_photo text,
  add column if not exists whatsapp_number text,
  add column if not exists package_type text not null default 'standard';

alter table public.listing_guest_threads
  add column if not exists buyer_photo text;

create table if not exists public.guest_chat_plans (
  access_key_hash text primary key,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.guest_chat_plans enable row level security;

drop policy if exists "no direct guest chat plan access" on public.guest_chat_plans;
create policy "no direct guest chat plan access"
on public.guest_chat_plans
for all
to public
using (false)
with check (false);

-- -----------------------------------------------------------------------------
-- 2. DAILY USAGE AND PRO STATUS HELPERS
-- -----------------------------------------------------------------------------

create or replace function public.guest_chat_is_pro(p_access_key text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    length(coalesce(p_access_key, '')) >= 20
    and (
      exists (
        select 1
        from public.guest_chat_plans p
        where p.access_key_hash = encode(digest(p_access_key, 'sha256'), 'hex')
          and p.plan = 'pro'
          and (p.expires_at is null or p.expires_at > now())
      )
      or exists (
        select 1
        from public.job_listings j
        where j.owner_key = p_access_key
          and lower(coalesce(j.package_type, 'standard')) = 'pro'
      )
    );
$$;

revoke all on function public.guest_chat_is_pro(text) from public;

create or replace function public.guest_chat_daily_message_count(p_access_key text)
returns bigint
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with day_start as (
    select (
      date_trunc('day', now() at time zone 'Africa/Johannesburg')
      at time zone 'Africa/Johannesburg'
    ) as starts_at
  ), permitted_messages as (
    select m.id
    from public.listing_guest_messages m
    join public.listing_guest_threads t on t.id = m.thread_id
    cross join day_start d
    where m.created_at >= d.starts_at
      and m.sender_role = 'buyer'
      and t.buyer_hash = encode(digest(coalesce(p_access_key, ''), 'sha256'), 'hex')

    union

    select m.id
    from public.listing_guest_messages m
    join public.listing_guest_threads t on t.id = m.thread_id
    join public.job_listings j on j.id = t.listing_id
    cross join day_start d
    where m.created_at >= d.starts_at
      and m.sender_role = 'owner'
      and j.owner_key = p_access_key
  )
  select count(*)::bigint from permitted_messages;
$$;

revoke all on function public.guest_chat_daily_message_count(text) from public;

create or replace function public.get_guest_chat_daily_usage(p_access_key text)
returns table (
  messages_used_today bigint,
  daily_message_limit integer,
  is_pro boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.guest_chat_daily_message_count(p_access_key),
    50,
    public.guest_chat_is_pro(p_access_key);
$$;

revoke all on function public.get_guest_chat_daily_usage(text) from public;
grant execute on function public.get_guest_chat_daily_usage(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. OPEN CHAT WITH OPTIONAL BUYER PROFILE PHOTO
-- -----------------------------------------------------------------------------

create or replace function public.open_listing_guest_chat_v2(
  p_listing_id uuid,
  p_buyer_key text,
  p_buyer_name text default 'Interested LoadLink user',
  p_buyer_photo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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
    raise exception 'This older listing cannot open chat yet. Use Call or WhatsApp for this listing.';
  end if;

  if v_owner_key = p_buyer_key then
    raise exception 'You cannot message your own listing';
  end if;

  v_buyer_hash := encode(digest(p_buyer_key, 'sha256'), 'hex');

  insert into public.listing_guest_threads (
    listing_id,
    buyer_hash,
    buyer_name,
    buyer_photo,
    buyer_last_seen,
    buyer_last_read_at,
    updated_at
  )
  values (
    p_listing_id,
    v_buyer_hash,
    coalesce(nullif(trim(p_buyer_name), ''), 'Interested LoadLink user'),
    nullif(trim(coalesce(p_buyer_photo, '')), ''),
    now(),
    now(),
    now()
  )
  on conflict (listing_id, buyer_hash)
  do update set
    buyer_name = excluded.buyer_name,
    buyer_photo = coalesce(excluded.buyer_photo, public.listing_guest_threads.buyer_photo),
    buyer_last_seen = now(),
    updated_at = greatest(public.listing_guest_threads.updated_at, excluded.updated_at)
  returning id into v_thread_id;

  return v_thread_id;
end;
$$;

revoke all on function public.open_listing_guest_chat_v2(uuid, text, text, text) from public;
grant execute on function public.open_listing_guest_chat_v2(uuid, text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. CONVERSATION LISTS WITH PHOTOS, STATUS AND DAILY USAGE
-- -----------------------------------------------------------------------------

drop function if exists public.get_buyer_guest_threads(text);
create function public.get_buyer_guest_threads(p_buyer_key text)
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  other_name text,
  other_phone text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  other_last_seen timestamptz,
  other_typing boolean,
  average_reply_minutes integer,
  last_message_has_attachment boolean,
  other_photo text,
  messages_used_today bigint,
  daily_message_limit integer,
  is_pro boolean
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    t.id,
    t.listing_id,
    j.title,
    coalesce(nullif(trim(j.posted_by), ''), 'Listing poster'),
    nullif(trim(j.contact_number), ''),
    last_message.body,
    last_message.created_at,
    (
      select count(*)
      from public.listing_guest_messages unread
      where unread.thread_id = t.id
        and unread.sender_role = 'owner'
        and unread.created_at > coalesce(t.buyer_last_read_at, t.created_at)
    )::bigint,
    t.owner_last_seen,
    coalesce(t.owner_typing_until > now(), false),
    public.guest_chat_average_reply_minutes(t.id, 'owner'),
    coalesce(last_message.has_attachment, false),
    nullif(trim(j.poster_photo), ''),
    public.guest_chat_daily_message_count(p_buyer_key),
    50,
    public.guest_chat_is_pro(p_buyer_key)
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select
      m.body,
      m.created_at,
      exists (
        select 1
        from public.listing_guest_attachments a
        where a.message_id = m.id
      ) as has_attachment
    from public.listing_guest_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where t.buyer_hash = encode(digest(coalesce(p_buyer_key, ''), 'sha256'), 'hex')
  order by coalesce(last_message.created_at, t.updated_at) desc;
$$;

revoke all on function public.get_buyer_guest_threads(text) from public;
grant execute on function public.get_buyer_guest_threads(text) to anon, authenticated;

drop function if exists public.get_owner_guest_threads(text);
create function public.get_owner_guest_threads(p_owner_key text)
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  other_name text,
  other_phone text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  other_last_seen timestamptz,
  other_typing boolean,
  average_reply_minutes integer,
  last_message_has_attachment boolean,
  other_photo text,
  messages_used_today bigint,
  daily_message_limit integer,
  is_pro boolean
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
    last_message.created_at,
    (
      select count(*)
      from public.listing_guest_messages unread
      where unread.thread_id = t.id
        and unread.sender_role = 'buyer'
        and unread.created_at > coalesce(t.owner_last_read_at, t.created_at)
    )::bigint,
    t.buyer_last_seen,
    coalesce(t.buyer_typing_until > now(), false),
    public.guest_chat_average_reply_minutes(t.id, 'buyer'),
    coalesce(last_message.has_attachment, false),
    nullif(trim(t.buyer_photo), ''),
    public.guest_chat_daily_message_count(p_owner_key),
    50,
    public.guest_chat_is_pro(p_owner_key)
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select
      m.body,
      m.created_at,
      exists (
        select 1
        from public.listing_guest_attachments a
        where a.message_id = m.id
      ) as has_attachment
    from public.listing_guest_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where j.owner_key = p_owner_key
    and length(coalesce(p_owner_key, '')) >= 20
  order by coalesce(last_message.created_at, t.updated_at) desc;
$$;

revoke all on function public.get_owner_guest_threads(text) from public;
grant execute on function public.get_owner_guest_threads(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. ENFORCE THE 50-MESSAGE FREE DAILY LIMIT
-- -----------------------------------------------------------------------------

drop function if exists public.send_listing_guest_message(uuid, text, text);
create function public.send_listing_guest_message(
  p_thread_id uuid,
  p_access_key text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_message_id uuid;
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);

  if v_role is null then
    raise exception 'You do not have access to this conversation';
  end if;

  if not public.guest_chat_is_pro(p_access_key)
     and public.guest_chat_daily_message_count(p_access_key) >= 50 then
    raise exception 'Daily message limit reached. Free accounts can send 50 messages per day.';
  end if;

  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Message must be between 1 and 4000 characters';
  end if;

  insert into public.listing_guest_messages (thread_id, sender_role, body)
  values (p_thread_id, v_role, trim(p_body))
  returning id into v_message_id;

  update public.listing_guest_threads
  set
    updated_at = now(),
    buyer_last_seen = case when v_role = 'buyer' then now() else buyer_last_seen end,
    owner_last_seen = case when v_role = 'owner' then now() else owner_last_seen end,
    buyer_typing_until = case when v_role = 'buyer' then null else buyer_typing_until end,
    owner_typing_until = case when v_role = 'owner' then null else owner_typing_until end
  where id = p_thread_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_listing_guest_message(uuid, text, text) from public;
grant execute on function public.send_listing_guest_message(uuid, text, text) to anon, authenticated;

create or replace function public.send_listing_guest_attachment(
  p_thread_id uuid,
  p_access_key text,
  p_file_name text,
  p_file_type text,
  p_file_base64 text,
  p_caption text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_message_id uuid;
  v_attachment_id uuid;
  v_file_data bytea;
  v_clean_name text;
  v_allowed_types text[] := array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);

  if v_role is null then
    raise exception 'You do not have access to this conversation';
  end if;

  if not public.guest_chat_is_pro(p_access_key)
     and public.guest_chat_daily_message_count(p_access_key) >= 50 then
    raise exception 'Daily message limit reached. Free accounts can send 50 messages per day.';
  end if;

  if not (coalesce(p_file_type, '') = any(v_allowed_types)) then
    raise exception 'This file type is not supported';
  end if;

  begin
    v_file_data := decode(coalesce(p_file_base64, ''), 'base64');
  exception when others then
    raise exception 'The selected file could not be read';
  end;

  if octet_length(v_file_data) < 1 or octet_length(v_file_data) > 5242880 then
    raise exception 'Files must be 5 MB or smaller';
  end if;

  v_clean_name := left(
    regexp_replace(
      coalesce(nullif(trim(p_file_name), ''), 'attachment'),
      '[\\/]+',
      '-',
      'g'
    ),
    180
  );

  insert into public.listing_guest_messages (thread_id, sender_role, body)
  values (
    p_thread_id,
    v_role,
    case
      when nullif(trim(coalesce(p_caption, '')), '') is not null then left(trim(p_caption), 4000)
      else 'Shared an attachment'
    end
  )
  returning id into v_message_id;

  insert into public.listing_guest_attachments (
    message_id,
    file_name,
    file_type,
    file_size,
    file_data
  )
  values (
    v_message_id,
    v_clean_name,
    p_file_type,
    octet_length(v_file_data),
    v_file_data
  )
  returning id into v_attachment_id;

  update public.listing_guest_threads
  set
    updated_at = now(),
    buyer_last_seen = case when v_role = 'buyer' then now() else buyer_last_seen end,
    owner_last_seen = case when v_role = 'owner' then now() else owner_last_seen end,
    buyer_typing_until = case when v_role = 'buyer' then null else buyer_typing_until end,
    owner_typing_until = case when v_role = 'owner' then null else owner_typing_until end
  where id = p_thread_id;

  return v_attachment_id;
end;
$$;

revoke all on function public.send_listing_guest_attachment(uuid, text, text, text, text, text) from public;
grant execute on function public.send_listing_guest_attachment(uuid, text, text, text, text, text) to anon, authenticated;

-- Direct access remains closed. Chat data is exposed only through protected RPCs.
