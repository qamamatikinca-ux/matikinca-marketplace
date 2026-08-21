alter table public.listing_guest_threads
  add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_listing_guest_threads_buyer_user_id
  on public.listing_guest_threads(buyer_user_id);

update public.listing_guest_threads t
set buyer_user_id = k.user_id
from public.user_chat_access_keys k
where t.buyer_user_id is null
  and k.access_key_hash = t.buyer_hash;

create or replace function public.loadlink_guard_guest_thread_insert_v266()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if not coalesce((select onboarding_complete from public.profiles where id = auth.uid()), false) then raise exception 'PROFILE_SETUP_REQUIRED'; end if;
  if new.buyer_user_id is null then
    new.buyer_user_id := auth.uid();
  elsif new.buyer_user_id <> auth.uid() then
    raise exception 'CHAT_BUYER_ACCOUNT_MISMATCH';
  end if;
  perform public.loadlink_enforce_rate_limit('message:new-thread', 20, 3600);
  return new;
end;
$function$;

create or replace function public.guest_chat_role(p_thread_id uuid, p_access_key text)
returns text
language plpgsql
stable security definer
set search_path to 'public','extensions','pg_temp'
as $function$
declare
  v_role text;
  v_uid uuid := auth.uid();
  v_hash text;
begin
  if v_uid is null then return null; end if;
  if length(coalesce(p_access_key,'')) < 20 then return null; end if;

  v_hash := encode(digest(coalesce(p_access_key,''),'sha256'),'hex');

  select case
    when t.buyer_user_id = v_uid then 'buyer'
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
$function$;

create or replace function public.get_buyer_guest_threads(p_buyer_key text)
returns table(id uuid, listing_id uuid, listing_title text, other_name text, other_phone text, last_message text, last_message_at timestamp with time zone, unread_count bigint, other_last_seen timestamp with time zone, other_typing boolean, average_reply_minutes integer, last_message_has_attachment boolean, other_photo text, messages_used_today bigint, daily_message_limit integer, is_pro boolean, request_status text, archived boolean)
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $function$
declare
  v_hash text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required'; end if;
  if length(coalesce(p_buyer_key,''))<20 then raise exception 'Chat device key is invalid'; end if;

  perform public.loadlink_register_chat_access_key(p_buyer_key);
  v_hash := public.loadlink_chat_key_hash(p_buyer_key);

  update public.listing_guest_threads
  set buyer_user_id = v_uid
  where buyer_user_id is null and buyer_hash = v_hash;

  return query
  select
    t.id,
    t.listing_id,
    j.title,
    coalesce(nullif(trim(owner_profile.full_name),''), nullif(trim(j.posted_by),''), 'Listing poster'),
    coalesce(nullif(trim(owner_profile.phone),''), nullif(trim(j.contact_number),'')),
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
    coalesce(nullif(trim(owner_profile.avatar_url),''), nullif(trim(j.poster_photo),'')),
    public.guest_chat_daily_message_count(p_buyer_key),
    50,
    public.guest_chat_is_pro(p_buyer_key),
    t.request_status,
    coalesce(t.buyer_archived,false)
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  left join public.profiles owner_profile on owner_profile.id=j.user_id
  left join lateral (
    select m.body,m.created_at,m.deleted_at,
      exists(select 1 from public.listing_guest_attachments a where a.message_id=m.id) as has_attachment
    from public.listing_guest_messages m
    where m.thread_id=t.id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where t.buyer_user_id=v_uid or t.buyer_hash=v_hash
  order by coalesce(last_message.created_at,t.updated_at) desc;
end;
$function$;

create or replace function public.loadlink_start_call_for_conversation(p_conversation_id uuid)
returns table(session_id uuid, max_seconds integer, remaining_seconds integer, premium boolean, started_at timestamp with time zone, callee_user_id uuid)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid:=auth.uid();
  v_buyer uuid;
  v_owner uuid;
  v_callee uuid;
  v_request_status text;
  v_started record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.loadlink_account_is_restricted(v_user) then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;

  select coalesce(t.buyer_user_id, public.loadlink_chat_user_id_from_hash(t.buyer_hash)), j.user_id, t.request_status
    into v_buyer,v_owner,v_request_status
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  where t.id=p_conversation_id;

  if not found or v_owner is null then raise exception 'CALL_CONVERSATION_UNAVAILABLE'; end if;
  if exists(select 1 from public.listing_guest_blocks b where b.thread_id=p_conversation_id) then raise exception 'CALL_CONVERSATION_BLOCKED'; end if;
  if coalesce(v_request_status,'pending')<>'accepted' then raise exception 'CALL_REQUEST_NOT_ACCEPTED'; end if;

  if v_buyer is null and v_user <> v_owner then
    if exists(select 1 from public.user_chat_access_keys k join public.listing_guest_threads t on t.buyer_hash=k.access_key_hash where t.id=p_conversation_id and k.user_id=v_user) then
      update public.listing_guest_threads set buyer_user_id=v_user where id=p_conversation_id and buyer_user_id is null;
      v_buyer:=v_user;
    end if;
  end if;

  if v_buyer is null then raise exception 'CALL_CONTACT_NOT_BOUND'; end if;

  if v_user=v_buyer then v_callee:=v_owner;
  elsif v_user=v_owner then v_callee:=v_buyer;
  else raise exception 'CALL_FORBIDDEN'; end if;

  if public.loadlink_account_is_restricted(v_callee) then raise exception 'CALL_USER_UNAVAILABLE'; end if;

  select * into v_started from public.loadlink_start_call_session(p_conversation_id,v_callee);
  return query select v_started.session_id,v_started.max_seconds,v_started.remaining_seconds,v_started.premium,v_started.started_at,v_callee;
end;
$function$;
