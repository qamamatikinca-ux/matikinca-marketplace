-- LOADLINK: guest chat for new and older listings + public listing RPC fallback
-- Safe to run more than once.

create extension if not exists pgcrypto;

alter table public.chat_conversations
  add column if not exists buyer_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists pending_owner_hash text;

create unique index if not exists chat_conversations_listing_buyer_uidx
  on public.chat_conversations(listing_id, buyer_user_id)
  where listing_id is not null and buyer_user_id is not null;

-- Public listing fallback that never exposes owner_key.
drop function if exists public.get_public_job_listings();
create function public.get_public_job_listings()
returns table (
  id uuid,
  title text,
  city text,
  vehicle_group text,
  rate text,
  posted_by text,
  contact_number text,
  whatsapp_number text,
  poster_photo text,
  description text,
  photos text[],
  sponsored boolean,
  package_type text,
  created_at timestamptz,
  view_count integer,
  last_viewed_at timestamptz,
  user_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    j.id,
    j.title,
    j.city,
    j.vehicle_group,
    j.rate,
    j.posted_by,
    coalesce(j.contact_number, ''),
    coalesce(j.whatsapp_number, ''),
    coalesce(j.poster_photo, ''),
    j.description,
    coalesce(j.photos, '{}'::text[]),
    coalesce(j.sponsored, false),
    coalesce(j.package_type, 'standard'),
    j.created_at,
    coalesce(j.view_count, 0),
    j.last_viewed_at,
    j.user_id
  from public.job_listings j
  order by j.created_at desc nulls last, j.id desc;
$$;
revoke all on function public.get_public_job_listings() from public;
grant execute on function public.get_public_job_listings() to anon, authenticated;

-- Start chat even when an older listing has no user_id yet.
drop function if exists public.start_listing_conversation(uuid, uuid, text);
create function public.start_listing_conversation(
  p_listing_id uuid,
  p_other_user uuid default null,
  p_other_name text default 'LoadLink user'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conversation_id uuid;
  v_listing_title text;
  v_listing_owner uuid;
  v_listing_owner_key text;
  v_listing_phone text;
  v_listing_poster text;
  v_me_name text;
  v_me_phone text;
  v_other_name text;
  v_other_phone text;
begin
  if auth.uid() is null then
    raise exception 'Guest session required';
  end if;

  select title, user_id, owner_key, contact_number, posted_by
    into v_listing_title, v_listing_owner, v_listing_owner_key, v_listing_phone, v_listing_poster
  from public.job_listings
  where id = p_listing_id;

  if not found then raise exception 'Listing not found'; end if;
  if v_listing_owner = auth.uid() then raise exception 'You cannot message your own listing'; end if;
  if v_listing_owner is not null and p_other_user is not null and p_other_user <> v_listing_owner then
    raise exception 'Invalid recipient';
  end if;

  select id into v_conversation_id
  from public.chat_conversations
  where listing_id = p_listing_id
    and buyer_user_id = auth.uid()
  limit 1;

  if v_conversation_id is null then
    insert into public.chat_conversations(
      listing_id, listing_title, buyer_user_id, pending_owner_hash
    ) values (
      p_listing_id,
      coalesce(v_listing_title, 'LoadLink listing'),
      auth.uid(),
      case when v_listing_owner is null then encode(digest(coalesce(v_listing_owner_key,''), 'sha256'), 'hex') else null end
    ) returning id into v_conversation_id;

    select coalesce(nullif(trim(full_name),''),'LoadLink guest'), phone
      into v_me_name, v_me_phone
    from public.profiles where id = auth.uid();

    insert into public.chat_participants(conversation_id,user_id,display_name,phone)
    values(v_conversation_id,auth.uid(),coalesce(v_me_name,'LoadLink guest'),v_me_phone)
    on conflict(conversation_id,user_id) do nothing;

    if v_listing_owner is not null then
      select coalesce(nullif(trim(full_name),''),nullif(trim(p_other_name),''),nullif(trim(v_listing_poster),''),'LoadLink user'),
             coalesce(phone,v_listing_phone)
        into v_other_name,v_other_phone
      from public.profiles where id = v_listing_owner;

      insert into public.chat_participants(conversation_id,user_id,display_name,phone)
      values(v_conversation_id,v_listing_owner,
        coalesce(v_other_name,nullif(trim(p_other_name),''),nullif(trim(v_listing_poster),''),'LoadLink user'),
        coalesce(v_other_phone,v_listing_phone))
      on conflict(conversation_id,user_id) do nothing;
    end if;
  end if;

  return v_conversation_id;
end;
$$;
revoke all on function public.start_listing_conversation(uuid, uuid, text) from public;
grant execute on function public.start_listing_conversation(uuid, uuid, text) to authenticated;

-- Claim old listings and attach their pending conversations when the poster returns on the posting device.
create or replace function public.claim_guest_listings(p_owner_key text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_owner_hash text;
  v_listing record;
  v_name text;
  v_phone text;
begin
  if auth.uid() is null then raise exception 'Guest session required'; end if;
  if length(coalesce(p_owner_key,'')) < 20 then raise exception 'Invalid owner key'; end if;

  v_owner_hash := encode(digest(p_owner_key, 'sha256'), 'hex');

  select coalesce(nullif(trim(full_name),''),'LoadLink poster'), phone
    into v_name, v_phone
  from public.profiles where id = auth.uid();

  for v_listing in
    update public.job_listings
      set user_id = auth.uid()
      where owner_key = p_owner_key
        and (user_id is null or user_id = auth.uid())
      returning id, posted_by, contact_number
  loop
    v_count := v_count + 1;

    insert into public.chat_participants(conversation_id,user_id,display_name,phone)
    select c.id, auth.uid(),
           coalesce(v_name,nullif(trim(v_listing.posted_by),''),'LoadLink poster'),
           coalesce(v_phone,v_listing.contact_number)
    from public.chat_conversations c
    where c.listing_id = v_listing.id
      and c.pending_owner_hash = v_owner_hash
    on conflict(conversation_id,user_id) do nothing;

    update public.chat_conversations
      set pending_owner_hash = null, updated_at = now()
      where listing_id = v_listing.id
        and pending_owner_hash = v_owner_hash;
  end loop;

  return v_count;
end;
$$;
revoke all on function public.claim_guest_listings(text) from public;
grant execute on function public.claim_guest_listings(text) to authenticated;

-- Conversation list supports pending conversations before the older poster returns.
drop function if exists public.get_my_conversations();
create function public.get_my_conversations()
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  other_user_id uuid,
  other_name text,
  other_phone text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  other_last_seen timestamptz,
  pending_owner boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.listing_id,
    c.listing_title,
    other_person.user_id,
    coalesce(other_person.display_name, j.posted_by, 'Listing poster'),
    coalesce(other_person.phone, j.contact_number),
    case
      when nullif(trim(last_message.body),'') is not null then last_message.body
      when last_message.file_path is not null then 'Attachment'
      else null
    end,
    last_message.created_at,
    (
      select count(*) from public.chat_messages unread
      where unread.conversation_id = c.id
        and unread.sender_id <> auth.uid()
        and unread.created_at > me.last_read_at
    ),
    p.last_seen,
    (other_person.user_id is null)
  from public.chat_conversations c
  join public.chat_participants me
    on me.conversation_id = c.id and me.user_id = auth.uid()
  left join public.chat_participants other_person
    on other_person.conversation_id = c.id and other_person.user_id <> auth.uid()
  left join public.job_listings j on j.id = c.listing_id
  left join public.profiles p on p.id = other_person.user_id
  left join lateral (
    select body,file_path,created_at
    from public.chat_messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) last_message on true
  order by coalesce(last_message.created_at,c.updated_at) desc;
$$;
revoke all on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

notify pgrst, 'reload schema';
