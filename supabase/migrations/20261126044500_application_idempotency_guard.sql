-- Prevent duplicates even if a device retries two send requests simultaneously.
create unique index if not exists loadlink_application_thread_client_once
  on public.listing_guest_messages(thread_id, (structured_payload->>'client_token'))
  where message_kind='application' and structured_payload ? 'client_token';

-- Job and contract applications are distinct structured LoadLink messages,
-- not long text blobs. Review and explicit send happen in the existing chat.
create or replace function public.send_listing_guest_application(
  p_thread_id uuid, p_access_key text, p_payload jsonb
) returns uuid
language plpgsql security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_role text;
  v_listing record;
  v_message_id uuid;
  v_payload jsonb;
  v_token text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if public.loadlink_account_is_restricted(auth.uid()) then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;
  v_role := public.guest_chat_role(p_thread_id,p_access_key);
  if v_role is distinct from 'buyer' then
    raise exception 'Only a signed-in applicant can apply to this listing';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>7500 then
    raise exception 'Invalid application preview';
  end if;

  select j.id, j.title, j.city, j.rate, j.listing_kind, j.status, j.moderation_status
  into v_listing
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  where t.id=p_thread_id;

  if not found or coalesce(v_listing.listing_kind,'') not in ('job','contract') then
    raise exception 'Applications are only available for jobs or contracts';
  end if;
  if coalesce(v_listing.status,'') <> 'active' or coalesce(v_listing.moderation_status,'') <> 'approved' then
    raise exception 'This listing is no longer accepting applications';
  end if;
  if coalesce(p_payload->>'kind','') <> v_listing.listing_kind
     or coalesce(p_payload->>'listing_id','') <> v_listing.id::text then
    raise exception 'Application does not match the selected listing';
  end if;
  if length(trim(coalesce(p_payload->>'applicant_name',''))) not between 1 and 160 then
    raise exception 'Enter an applicant name';
  end if;

  v_token := coalesce(p_payload->>'client_token','');
  if v_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid application request';
  end if;

  -- An interrupted request can be retried without creating duplicate applications.
  select m.id into v_message_id
  from public.listing_guest_messages m
  where m.thread_id=p_thread_id and m.sender_role='buyer'
    and m.message_kind='application' and m.structured_payload->>'client_token'=v_token
  limit 1;
  if v_message_id is not null then return v_message_id; end if;

  if not public.guest_chat_is_pro(p_access_key)
     and public.guest_chat_daily_message_count(p_access_key) >= 50 then
    raise exception 'Daily message limit reached';
  end if;

  v_payload := jsonb_build_object(
    'kind', v_listing.listing_kind,
    'listing_id', v_listing.id::text,
    'listing_title', left(coalesce(v_listing.title,''),220),
    'city', left(coalesce(v_listing.city,''),160),
    'advertised_rate', left(coalesce(v_listing.rate,''),160),
    'vehicle', left(trim(coalesce(p_payload->>'vehicle','')),160),
    'applicant_name', left(trim(p_payload->>'applicant_name'),160),
    'company', left(trim(coalesce(p_payload->>'company','')),160),
    'email', left(trim(coalesce(p_payload->>'email','')),180),
    'phone', left(trim(coalesce(p_payload->>'phone','')),80),
    'area', left(trim(coalesce(p_payload->>'area','')),160),
    'offer', left(trim(coalesce(p_payload->>'offer','')),100),
    'note', left(trim(coalesce(p_payload->>'note','')),600),
    'details', left(trim(coalesce(p_payload->>'details','')),3400),
    'client_token', v_token
  );
  insert into public.listing_guest_messages(thread_id,sender_role,body,message_kind,structured_payload)
  values (p_thread_id,'buyer',
    case when v_listing.listing_kind='job' then 'LoadLink job application' else 'LoadLink contract application' end,
    'application',v_payload)
  on conflict do nothing
  returning id into v_message_id;

  if v_message_id is null then
    select m.id into v_message_id
    from public.listing_guest_messages m
    where m.thread_id=p_thread_id and m.sender_role='buyer'
      and m.message_kind='application' and m.structured_payload->>'client_token'=v_token
    limit 1;
  end if;
  if v_message_id is null then raise exception 'Application send failed; please retry'; end if;

  update public.listing_guest_threads
  set updated_at=now(), buyer_typing_until=null
  where id=p_thread_id;
  return v_message_id;
end;
$function$;

revoke all on function public.send_listing_guest_application(uuid,text,jsonb) from public, anon;
grant execute on function public.send_listing_guest_application(uuid,text,jsonb) to authenticated;
