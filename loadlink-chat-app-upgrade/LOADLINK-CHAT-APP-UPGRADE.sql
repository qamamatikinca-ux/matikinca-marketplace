-- LOADLINK CHAT APP UPGRADE
-- Run this entire file once in Supabase SQL Editor AFTER the existing no-login chat SQL.
-- Safe to run more than once. It keeps the current no-login/device-key chat model.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. PRESENCE, READ RECEIPTS AND PRIVATE ATTACHMENTS
-- -----------------------------------------------------------------------------

alter table public.listing_guest_threads
  add column if not exists buyer_last_seen timestamptz,
  add column if not exists owner_last_seen timestamptz,
  add column if not exists buyer_last_read_at timestamptz not null default now(),
  add column if not exists owner_last_read_at timestamptz not null default now(),
  add column if not exists buyer_typing_until timestamptz,
  add column if not exists owner_typing_until timestamptz;

create table if not exists public.listing_guest_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.listing_guest_messages(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  file_data bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_guest_attachments_message_idx
  on public.listing_guest_attachments(message_id);

alter table public.listing_guest_attachments enable row level security;

drop policy if exists "no direct guest attachment access" on public.listing_guest_attachments;
create policy "no direct guest attachment access"
on public.listing_guest_attachments
for all
to public
using (false)
with check (false);

-- -----------------------------------------------------------------------------
-- 2. INTERNAL ACCESS HELPERS
-- -----------------------------------------------------------------------------

create or replace function public.guest_chat_role(
  p_thread_id uuid,
  p_access_key text
)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text;
begin
  if length(coalesce(p_access_key, '')) < 20 then
    return null;
  end if;

  select case
    when t.buyer_hash = encode(digest(p_access_key, 'sha256'), 'hex') then 'buyer'
    when j.owner_key = p_access_key then 'owner'
    else null
  end
  into v_role
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  where t.id = p_thread_id;

  return v_role;
end;
$$;

revoke all on function public.guest_chat_role(uuid, text) from public;

create or replace function public.guest_chat_average_reply_minutes(
  p_thread_id uuid,
  p_responder_role text
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when avg_minutes is null then null
    else greatest(1, least(10080, round(avg_minutes)::integer))
  end
  from (
    select avg(extract(epoch from (reply.created_at - sent.created_at)) / 60.0) as avg_minutes
    from public.listing_guest_messages sent
    join lateral (
      select candidate.created_at
      from public.listing_guest_messages candidate
      where candidate.thread_id = sent.thread_id
        and candidate.sender_role = p_responder_role
        and candidate.created_at > sent.created_at
      order by candidate.created_at
      limit 1
    ) reply on true
    where sent.thread_id = p_thread_id
      and sent.sender_role <> p_responder_role
  ) response_stats;
$$;

revoke all on function public.guest_chat_average_reply_minutes(uuid, text) from public;

-- -----------------------------------------------------------------------------
-- 3. OPEN CHAT AND CONVERSATION LISTS
-- -----------------------------------------------------------------------------

create or replace function public.open_listing_guest_chat(
  p_listing_id uuid,
  p_buyer_key text,
  p_buyer_name text default 'Interested LoadLink user'
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
    buyer_last_seen,
    buyer_last_read_at,
    updated_at
  )
  values (
    p_listing_id,
    v_buyer_hash,
    coalesce(nullif(trim(p_buyer_name), ''), 'Interested LoadLink user'),
    now(),
    now(),
    now()
  )
  on conflict (listing_id, buyer_hash)
  do update set
    buyer_name = excluded.buyer_name,
    buyer_last_seen = now(),
    updated_at = greatest(public.listing_guest_threads.updated_at, excluded.updated_at)
  returning id into v_thread_id;

  return v_thread_id;
end;
$$;

revoke all on function public.open_listing_guest_chat(uuid, text, text) from public;
grant execute on function public.open_listing_guest_chat(uuid, text, text) to anon, authenticated;

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
  last_message_has_attachment boolean
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
    coalesce(last_message.has_attachment, false)
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select
      m.body,
      m.created_at,
      exists(select 1 from public.listing_guest_attachments a where a.message_id = m.id) as has_attachment
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
  last_message_has_attachment boolean
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
    coalesce(last_message.has_attachment, false)
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select
      m.body,
      m.created_at,
      exists(select 1 from public.listing_guest_attachments a where a.message_id = m.id) as has_attachment
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
-- 4. MESSAGES, READ STATE, PRESENCE AND TYPING
-- -----------------------------------------------------------------------------

drop function if exists public.get_listing_guest_messages(uuid, text);
create function public.get_listing_guest_messages(
  p_thread_id uuid,
  p_access_key text
)
returns table (
  id uuid,
  sender_role text,
  body text,
  created_at timestamptz,
  attachment_id uuid,
  file_name text,
  file_type text,
  file_size bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.guest_chat_role(p_thread_id, p_access_key) is null then
    raise exception 'You do not have access to this conversation';
  end if;

  return query
  select
    m.id,
    m.sender_role,
    m.body,
    m.created_at,
    a.id,
    a.file_name,
    a.file_type,
    a.file_size
  from public.listing_guest_messages m
  left join public.listing_guest_attachments a on a.message_id = m.id
  where m.thread_id = p_thread_id
  order by m.created_at;
end;
$$;

revoke all on function public.get_listing_guest_messages(uuid, text) from public;
grant execute on function public.get_listing_guest_messages(uuid, text) to anon, authenticated;

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

  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Message must be between 1 and 4000 characters';
  end if;

  insert into public.listing_guest_messages(thread_id, sender_role, body)
  values (p_thread_id, v_role, trim(p_body))
  returning id into v_message_id;

  update public.listing_guest_threads
  set updated_at = now(),
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

create or replace function public.mark_listing_guest_read(
  p_thread_id uuid,
  p_access_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);
  if v_role is null then
    raise exception 'You do not have access to this conversation';
  end if;

  update public.listing_guest_threads
  set buyer_last_read_at = case when v_role = 'buyer' then now() else buyer_last_read_at end,
      owner_last_read_at = case when v_role = 'owner' then now() else owner_last_read_at end,
      buyer_last_seen = case when v_role = 'buyer' then now() else buyer_last_seen end,
      owner_last_seen = case when v_role = 'owner' then now() else owner_last_seen end
  where id = p_thread_id;

  return true;
end;
$$;

revoke all on function public.mark_listing_guest_read(uuid, text) from public;
grant execute on function public.mark_listing_guest_read(uuid, text) to anon, authenticated;

create or replace function public.touch_listing_guest_presence(
  p_thread_id uuid,
  p_access_key text,
  p_is_typing boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);
  if v_role is null then
    raise exception 'You do not have access to this conversation';
  end if;

  update public.listing_guest_threads
  set buyer_last_seen = case when v_role = 'buyer' then now() else buyer_last_seen end,
      owner_last_seen = case when v_role = 'owner' then now() else owner_last_seen end,
      buyer_typing_until = case
        when v_role = 'buyer' and p_is_typing then now() + interval '12 seconds'
        when v_role = 'buyer' then null
        else buyer_typing_until
      end,
      owner_typing_until = case
        when v_role = 'owner' and p_is_typing then now() + interval '12 seconds'
        when v_role = 'owner' then null
        else owner_typing_until
      end
  where id = p_thread_id;

  return true;
end;
$$;

revoke all on function public.touch_listing_guest_presence(uuid, text, boolean) from public;
grant execute on function public.touch_listing_guest_presence(uuid, text, boolean) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. PRIVATE FILE UPLOAD/DOWNLOAD THROUGH PROTECTED RPCS
-- -----------------------------------------------------------------------------

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

  v_clean_name := left(regexp_replace(coalesce(nullif(trim(p_file_name), ''), 'attachment'), '[\\/]+', '-', 'g'), 180);

  insert into public.listing_guest_messages(thread_id, sender_role, body)
  values (
    p_thread_id,
    v_role,
    case
      when nullif(trim(coalesce(p_caption, '')), '') is not null then left(trim(p_caption), 4000)
      else 'Shared an attachment'
    end
  )
  returning id into v_message_id;

  insert into public.listing_guest_attachments(
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
  set updated_at = now(),
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

create or replace function public.get_listing_guest_attachment(
  p_attachment_id uuid,
  p_access_key text
)
returns table (
  file_name text,
  file_type text,
  file_size bigint,
  file_base64 text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread_id uuid;
begin
  select m.thread_id
  into v_thread_id
  from public.listing_guest_attachments a
  join public.listing_guest_messages m on m.id = a.message_id
  where a.id = p_attachment_id;

  if v_thread_id is null or public.guest_chat_role(v_thread_id, p_access_key) is null then
    raise exception 'You do not have access to this attachment';
  end if;

  return query
  select a.file_name, a.file_type, a.file_size, encode(a.file_data, 'base64')
  from public.listing_guest_attachments a
  where a.id = p_attachment_id;
end;
$$;

revoke all on function public.get_listing_guest_attachment(uuid, text) from public;
grant execute on function public.get_listing_guest_attachment(uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. HOME-PAGE UNREAD BADGE
-- -----------------------------------------------------------------------------

create or replace function public.get_guest_chat_unread_total(
  p_buyer_key text,
  p_owner_keys text[] default '{}'::text[]
)
returns bigint
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with buyer_threads as (
    select t.id, coalesce(t.buyer_last_read_at, t.created_at) as read_at
    from public.listing_guest_threads t
    where t.buyer_hash = encode(digest(coalesce(p_buyer_key, ''), 'sha256'), 'hex')
  ),
  owner_threads as (
    select t.id, coalesce(t.owner_last_read_at, t.created_at) as read_at
    from public.listing_guest_threads t
    join public.job_listings j on j.id = t.listing_id
    where j.owner_key = any(coalesce(p_owner_keys, '{}'::text[]))
  ),
  buyer_unread as (
    select count(*)::bigint as total
    from public.listing_guest_messages m
    join buyer_threads t on t.id = m.thread_id
    where m.sender_role = 'owner'
      and m.created_at > t.read_at
  ),
  owner_unread as (
    select count(*)::bigint as total
    from public.listing_guest_messages m
    join owner_threads t on t.id = m.thread_id
    where m.sender_role = 'buyer'
      and m.created_at > t.read_at
  )
  select coalesce((select total from buyer_unread), 0)
       + coalesce((select total from owner_unread), 0);
$$;

revoke all on function public.get_guest_chat_unread_total(text, text[]) from public;
grant execute on function public.get_guest_chat_unread_total(text, text[]) to anon, authenticated;

-- Keep direct table access closed. All reads and writes happen through the protected functions above.
