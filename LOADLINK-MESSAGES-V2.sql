-- LOADLINK MESSAGES V2
-- Run AFTER LOADLINK-MESSAGE-PRIVACY.sql.
-- Additive/rerunnable: no message, conversation, listing, profile or user rows are deleted.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema public to anon, authenticated;

do $$
begin
  if to_regprocedure('public.guest_chat_role(uuid,text)') is null then
    raise exception 'LoadLink chat foundation is missing. Run the existing LoadLink chat SQL first.';
  end if;
  if to_regprocedure('public.loadlink_chat_key_hash(text)') is null then
    raise exception 'Message privacy update is missing. Run LOADLINK-MESSAGE-PRIVACY.sql first.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. POTENTIAL DEALS + MESSAGE METADATA
-- ---------------------------------------------------------------------------

alter table public.listing_guest_threads
  add column if not exists request_status text,
  add column if not exists request_created_at timestamptz;

-- Every thread that already existed before this update remains a normal accepted chat.
update public.listing_guest_threads
set request_status = 'accepted'
where request_status is null;

alter table public.listing_guest_threads
  alter column request_status set default 'pending',
  alter column request_status set not null;

update public.listing_guest_threads
set request_created_at = coalesce(request_created_at, created_at)
where request_created_at is null;

alter table public.listing_guest_messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists message_kind text not null default 'text',
  add column if not exists structured_payload jsonb,
  add column if not exists starred_by_buyer boolean not null default false,
  add column if not exists starred_by_owner boolean not null default false;

create index if not exists listing_guest_threads_request_status_idx
  on public.listing_guest_threads(request_status, updated_at desc);
create index if not exists listing_guest_messages_thread_created_v2_idx
  on public.listing_guest_messages(thread_id, created_at desc);

-- Pending potential deals are buyer-to-owner requests. Owners must accept first.
-- Declined requests cannot continue sending from either side.
create or replace function public.loadlink_guest_request_send_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select request_status into v_status
  from public.listing_guest_threads
  where id = new.thread_id;

  if v_status = 'declined' then
    raise exception 'This potential deal was declined';
  end if;
  if v_status = 'pending' and new.sender_role = 'owner' then
    raise exception 'Accept this potential deal before replying';
  end if;
  return new;
end;
$$;

drop trigger if exists loadlink_guest_request_send_guard_trigger on public.listing_guest_messages;
create trigger loadlink_guest_request_send_guard_trigger
before insert on public.listing_guest_messages
for each row execute function public.loadlink_guest_request_send_guard();

-- ---------------------------------------------------------------------------
-- 2. CONVERSATION LISTS: PRIVACY + POTENTIAL DEAL STATUS
-- ---------------------------------------------------------------------------

drop function if exists public.get_buyer_guest_threads(text);
create function public.get_buyer_guest_threads(p_buyer_key text)
returns table (
  id uuid, listing_id uuid, listing_title text, other_name text, other_phone text,
  last_message text, last_message_at timestamptz, unread_count bigint,
  other_last_seen timestamptz, other_typing boolean, average_reply_minutes integer,
  last_message_has_attachment boolean, other_photo text,
  messages_used_today bigint, daily_message_limit integer, is_pro boolean,
  request_status text
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
    case when last_message.deleted_at is not null then 'Message deleted' else last_message.body end,
    last_message.created_at,
    (
      select count(*) from public.listing_guest_messages unread
      where unread.thread_id = t.id
        and unread.sender_role = 'owner'
        and unread.created_at > coalesce(t.buyer_last_read_at, t.created_at)
    )::bigint,
    case when public.loadlink_chat_activity_visible(j.owner_key) then t.owner_last_seen else null end,
    case when public.loadlink_chat_typing_visible(j.owner_key) then coalesce(t.owner_typing_until > now(), false) else false end,
    public.guest_chat_average_reply_minutes(t.id, 'owner'),
    coalesce(last_message.has_attachment, false),
    nullif(trim(j.poster_photo), ''),
    public.guest_chat_daily_message_count(p_buyer_key),
    50,
    public.guest_chat_is_pro(p_buyer_key),
    t.request_status
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select m.body, m.created_at, m.deleted_at,
      exists(select 1 from public.listing_guest_attachments a where a.message_id = m.id) as has_attachment
    from public.listing_guest_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where t.buyer_hash = public.loadlink_chat_key_hash(p_buyer_key)
  order by coalesce(last_message.created_at, t.updated_at) desc;
$$;

revoke all on function public.get_buyer_guest_threads(text) from public;
grant execute on function public.get_buyer_guest_threads(text) to anon, authenticated;

drop function if exists public.get_owner_guest_threads(text);
create function public.get_owner_guest_threads(p_owner_key text)
returns table (
  id uuid, listing_id uuid, listing_title text, other_name text, other_phone text,
  last_message text, last_message_at timestamptz, unread_count bigint,
  other_last_seen timestamptz, other_typing boolean, average_reply_minutes integer,
  last_message_has_attachment boolean, other_photo text,
  messages_used_today bigint, daily_message_limit integer, is_pro boolean,
  request_status text
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
    case when last_message.deleted_at is not null then 'Message deleted' else last_message.body end,
    last_message.created_at,
    (
      select count(*) from public.listing_guest_messages unread
      where unread.thread_id = t.id
        and unread.sender_role = 'buyer'
        and unread.created_at > coalesce(t.owner_last_read_at, t.created_at)
    )::bigint,
    case when public.loadlink_chat_activity_visible_hash(t.buyer_hash) then t.buyer_last_seen else null end,
    case when public.loadlink_chat_typing_visible_hash(t.buyer_hash) then coalesce(t.buyer_typing_until > now(), false) else false end,
    public.guest_chat_average_reply_minutes(t.id, 'buyer'),
    coalesce(last_message.has_attachment, false),
    nullif(trim(t.buyer_photo), ''),
    public.guest_chat_daily_message_count(p_owner_key),
    50,
    public.guest_chat_is_pro(p_owner_key),
    t.request_status
  from public.listing_guest_threads t
  join public.job_listings j on j.id = t.listing_id
  left join lateral (
    select m.body, m.created_at, m.deleted_at,
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

-- ---------------------------------------------------------------------------
-- 3. MESSAGE FEED: EDIT/DELETE/STAR/STRUCTURED QUOTES
-- ---------------------------------------------------------------------------

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
  file_size bigint,
  edited_at timestamptz,
  deleted_at timestamptz,
  message_kind text,
  structured_payload jsonb,
  starred_by_me boolean
)
language plpgsql
stable
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

  return query
  select
    m.id,
    m.sender_role,
    case when m.deleted_at is not null then 'Message deleted' else m.body end,
    m.created_at,
    case when m.deleted_at is not null then null::uuid else a.id end,
    case when m.deleted_at is not null then null::text else a.file_name end,
    case when m.deleted_at is not null then null::text else a.file_type end,
    case when m.deleted_at is not null then null::bigint else a.file_size end,
    m.edited_at,
    m.deleted_at,
    m.message_kind,
    case when m.deleted_at is not null then null::jsonb else m.structured_payload end,
    case when v_role = 'buyer' then m.starred_by_buyer else m.starred_by_owner end
  from public.listing_guest_messages m
  left join public.listing_guest_attachments a on a.message_id = m.id
  where m.thread_id = p_thread_id
  order by m.created_at;
end;
$$;

revoke all on function public.get_listing_guest_messages(uuid, text) from public;
grant execute on function public.get_listing_guest_messages(uuid, text) to anon, authenticated;

create or replace function public.send_listing_guest_structured_message(
  p_thread_id uuid,
  p_access_key text,
  p_kind text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_message_id uuid;
  v_payload jsonb;
  v_unit text;
  v_vat text;
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  if p_kind <> 'quote' then raise exception 'Unsupported structured message type'; end if;
  if not public.guest_chat_is_pro(p_access_key) and public.guest_chat_daily_message_count(p_access_key) >= 50 then
    raise exception 'Daily message limit reached. Free accounts can send 50 messages per day.';
  end if;
  if char_length(trim(coalesce(p_payload->>'amount',''))) not between 1 and 40 then raise exception 'Enter a quote amount'; end if;

  v_unit := case when p_payload->>'unit' in ('total','km','ton','day') then p_payload->>'unit' else 'total' end;
  v_vat := case when p_payload->>'vat' in ('included','excluded','not_applicable') then p_payload->>'vat' else 'not_applicable' end;
  v_payload := jsonb_build_object(
    'amount', left(trim(coalesce(p_payload->>'amount','')),40),
    'unit', v_unit,
    'vehicle', left(trim(coalesce(p_payload->>'vehicle','')),160),
    'route', left(trim(coalesce(p_payload->>'route','')),300),
    'availability', left(trim(coalesce(p_payload->>'availability','')),160),
    'vat', v_vat,
    'terms', left(trim(coalesce(p_payload->>'terms','')),1000),
    'listing_title', left(trim(coalesce(p_payload->>'listing_title','')),220),
    'status', 'pending'
  );

  insert into public.listing_guest_messages(thread_id, sender_role, body, message_kind, structured_payload)
  values(p_thread_id, v_role, 'Sent a rate quote', 'quote', v_payload)
  returning id into v_message_id;

  update public.listing_guest_threads set updated_at = now() where id = p_thread_id;
  return v_message_id;
end;
$$;

create or replace function public.edit_listing_guest_message(
  p_message_id uuid,
  p_access_key text,
  p_body text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread uuid;
  v_sender text;
  v_created timestamptz;
  v_kind text;
  v_role text;
begin
  select thread_id, sender_role, created_at, message_kind into v_thread, v_sender, v_created, v_kind
  from public.listing_guest_messages where id = p_message_id;
  if v_thread is null then raise exception 'Message not found'; end if;
  v_role := public.guest_chat_role(v_thread, p_access_key);
  if v_role is null or v_role <> v_sender then raise exception 'You can edit only your own messages'; end if;
  if v_created < now() - interval '15 minutes' then raise exception 'Messages can be edited for 15 minutes'; end if;
  if v_kind <> 'text' then raise exception 'This message type cannot be edited'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Message must be between 1 and 4000 characters'; end if;
  update public.listing_guest_messages
  set body = trim(p_body), edited_at = now()
  where id = p_message_id and deleted_at is null;
  if not found then raise exception 'Deleted messages cannot be edited'; end if;
  return true;
end;
$$;

create or replace function public.delete_listing_guest_message(
  p_message_id uuid,
  p_access_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread uuid;
  v_sender text;
  v_created timestamptz;
  v_role text;
begin
  select thread_id, sender_role, created_at into v_thread, v_sender, v_created
  from public.listing_guest_messages where id = p_message_id;
  if v_thread is null then raise exception 'Message not found'; end if;
  v_role := public.guest_chat_role(v_thread, p_access_key);
  if v_role is null or v_role <> v_sender then raise exception 'You can delete only your own messages'; end if;
  if v_created < now() - interval '15 minutes' then raise exception 'Messages can be deleted for 15 minutes'; end if;
  delete from public.listing_guest_attachments where message_id = p_message_id;
  update public.listing_guest_messages
  set body = 'Message deleted', deleted_at = now(), structured_payload = null
  where id = p_message_id and deleted_at is null;
  return true;
end;
$$;

create or replace function public.set_listing_guest_message_star(
  p_message_id uuid,
  p_access_key text,
  p_starred boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread uuid;
  v_role text;
begin
  select thread_id into v_thread from public.listing_guest_messages where id = p_message_id;
  if v_thread is null then raise exception 'Message not found'; end if;
  v_role := public.guest_chat_role(v_thread, p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  update public.listing_guest_messages
  set starred_by_buyer = case when v_role = 'buyer' then p_starred else starred_by_buyer end,
      starred_by_owner = case when v_role = 'owner' then p_starred else starred_by_owner end
  where id = p_message_id;
  return true;
end;
$$;

create or replace function public.respond_listing_guest_quote(
  p_message_id uuid,
  p_access_key text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread uuid;
  v_sender text;
  v_kind text;
  v_role text;
  v_current text;
begin
  select thread_id, sender_role, message_kind, structured_payload->>'status'
  into v_thread, v_sender, v_kind, v_current
  from public.listing_guest_messages where id = p_message_id and deleted_at is null;
  if v_thread is null or v_kind <> 'quote' then raise exception 'Quote not found'; end if;
  v_role := public.guest_chat_role(v_thread, p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  if v_role = v_sender then raise exception 'The recipient must respond to this quote'; end if;
  if p_status not in ('accepted','declined') then raise exception 'Invalid quote response'; end if;
  if coalesce(v_current,'pending') <> 'pending' then raise exception 'This quote already has a response'; end if;
  update public.listing_guest_messages
  set structured_payload = jsonb_set(jsonb_set(coalesce(structured_payload,'{}'::jsonb), '{status}', to_jsonb(p_status), true), '{responded_at}', to_jsonb(now()::text), true)
  where id = p_message_id;
  update public.listing_guest_threads set updated_at = now() where id = v_thread;
  return true;
end;
$$;

create or replace function public.set_listing_guest_request_status(
  p_thread_id uuid,
  p_access_key text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_current text;
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);
  if v_role <> 'owner' then raise exception 'Only the listing owner can respond to a potential deal'; end if;
  if p_status not in ('accepted','declined') then raise exception 'Invalid potential deal response'; end if;
  select request_status into v_current from public.listing_guest_threads where id = p_thread_id;
  if v_current <> 'pending' then raise exception 'This potential deal has already been handled'; end if;
  update public.listing_guest_threads
  set request_status = p_status, updated_at = now()
  where id = p_thread_id;
  return true;
end;
$$;

revoke all on function public.send_listing_guest_structured_message(uuid,text,text,jsonb) from public;
revoke all on function public.edit_listing_guest_message(uuid,text,text) from public;
revoke all on function public.delete_listing_guest_message(uuid,text) from public;
revoke all on function public.set_listing_guest_message_star(uuid,text,boolean) from public;
revoke all on function public.respond_listing_guest_quote(uuid,text,text) from public;
revoke all on function public.set_listing_guest_request_status(uuid,text,text) from public;
grant execute on function public.send_listing_guest_structured_message(uuid,text,text,jsonb) to anon, authenticated;
grant execute on function public.edit_listing_guest_message(uuid,text,text) to anon, authenticated;
grant execute on function public.delete_listing_guest_message(uuid,text) to anon, authenticated;
grant execute on function public.set_listing_guest_message_star(uuid,text,boolean) to anon, authenticated;
grant execute on function public.respond_listing_guest_quote(uuid,text,text) to anon, authenticated;
grant execute on function public.set_listing_guest_request_status(uuid,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. WEB PUSH SUBSCRIPTIONS
-- Direct browser access is disabled; server routes use the service role.
-- ---------------------------------------------------------------------------

create table if not exists public.loadlink_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loadlink_push_subscriptions_user_idx on public.loadlink_push_subscriptions(user_id);
alter table public.loadlink_push_subscriptions enable row level security;
revoke all on public.loadlink_push_subscriptions from anon, authenticated;

drop policy if exists "no direct push subscription access" on public.loadlink_push_subscriptions;
create policy "no direct push subscription access"
on public.loadlink_push_subscriptions for all to public
using (false) with check (false);

commit;

select 'LoadLink Messages V2 installed' as result;
