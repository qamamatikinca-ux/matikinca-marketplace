create or replace function public.guest_chat_role(p_thread_id uuid, p_access_key text)
returns text
language plpgsql
stable
security definer
set search_path to 'public','extensions','pg_temp'
as $$
declare
  v_role text;
  v_uid uuid := auth.uid();
  v_hash text;
begin
  if v_uid is null then return null; end if;
  if length(coalesce(p_access_key,'')) < 20 then return null; end if;

  v_hash := encode(digest(coalesce(p_access_key,''),'sha256'),'hex');

  select case
    when t.buyer_hash = v_hash
      and exists (
        select 1 from public.user_chat_access_keys k
        where k.access_key_hash=v_hash and k.user_id=v_uid
      ) then 'buyer'
    when j.user_id=v_uid then 'owner'
    else null
  end
  into v_role
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  where t.id=p_thread_id;

  return v_role;
end;
$$;

revoke all on function public.guest_chat_role(uuid,text) from public, anon;
grant execute on function public.guest_chat_role(uuid,text) to authenticated, service_role;

drop function if exists public.get_buyer_guest_threads(text);
create function public.get_buyer_guest_threads(p_buyer_key text)
returns table(
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
  is_pro boolean,
  request_status text,
  archived boolean
)
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if length(coalesce(p_buyer_key,''))<20 then raise exception 'Chat device key is invalid'; end if;

  perform public.loadlink_register_chat_access_key(p_buyer_key);
  v_hash := public.loadlink_chat_key_hash(p_buyer_key);

  return query
  select
    t.id,
    t.listing_id,
    j.title,
    coalesce(nullif(trim(j.posted_by),''),'Listing poster'),
    nullif(trim(j.contact_number),''),
    case when last_message.deleted_at is not null then 'Message deleted' else last_message.body end,
    last_message.created_at,
    (
      select count(*) from public.listing_guest_messages unread
      where unread.thread_id=t.id
        and unread.sender_role='owner'
        and unread.created_at>coalesce(t.buyer_last_read_at,t.created_at)
    )::bigint,
    case when public.loadlink_chat_activity_visible(j.owner_key) then t.owner_last_seen else null end,
    case when public.loadlink_chat_typing_visible(j.owner_key) then coalesce(t.owner_typing_until>now(),false) else false end,
    public.guest_chat_average_reply_minutes(t.id,'owner'),
    coalesce(last_message.has_attachment,false),
    nullif(trim(j.poster_photo),''),
    public.guest_chat_daily_message_count(p_buyer_key),
    50,
    public.guest_chat_is_pro(p_buyer_key),
    t.request_status,
    coalesce(t.buyer_archived,false)
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  left join lateral (
    select m.body,m.created_at,m.deleted_at,
      exists(select 1 from public.listing_guest_attachments a where a.message_id=m.id) as has_attachment
    from public.listing_guest_messages m
    where m.thread_id=t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where t.buyer_hash=v_hash
  order by coalesce(last_message.created_at,t.updated_at) desc;
end;
$$;

revoke all on function public.get_buyer_guest_threads(text) from public, anon;
grant execute on function public.get_buyer_guest_threads(text) to authenticated, service_role;

drop function if exists public.get_owner_guest_threads(text);
create function public.get_owner_guest_threads(p_owner_key text)
returns table(
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
  is_pro boolean,
  request_status text,
  archived boolean
)
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select
    t.id,
    t.listing_id,
    j.title,
    coalesce(nullif(trim(t.buyer_name),''),'Interested LoadLink user'),
    null::text,
    case when last_message.deleted_at is not null then 'Message deleted' else last_message.body end,
    last_message.created_at,
    (
      select count(*) from public.listing_guest_messages unread
      where unread.thread_id=t.id
        and unread.sender_role='buyer'
        and unread.created_at>coalesce(t.owner_last_read_at,t.created_at)
    )::bigint,
    case when public.loadlink_chat_activity_visible_hash(t.buyer_hash) then t.buyer_last_seen else null end,
    case when public.loadlink_chat_typing_visible_hash(t.buyer_hash) then coalesce(t.buyer_typing_until>now(),false) else false end,
    public.guest_chat_average_reply_minutes(t.id,'buyer'),
    coalesce(last_message.has_attachment,false),
    nullif(trim(t.buyer_photo),''),
    public.guest_chat_daily_message_count(p_owner_key),
    50,
    public.guest_chat_is_pro(p_owner_key),
    t.request_status,
    coalesce(t.owner_archived,false)
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  left join lateral (
    select m.body,m.created_at,m.deleted_at,
      exists(select 1 from public.listing_guest_attachments a where a.message_id=m.id) as has_attachment
    from public.listing_guest_messages m
    where m.thread_id=t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where auth.uid() is not null and j.user_id=auth.uid()
  order by coalesce(last_message.created_at,t.updated_at) desc;
$$;

revoke all on function public.get_owner_guest_threads(text) from public, anon;
grant execute on function public.get_owner_guest_threads(text) to authenticated, service_role;
