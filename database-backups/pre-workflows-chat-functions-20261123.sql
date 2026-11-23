-- Original LoadLink quotation functions, preserved before driver/offer workflow changes.
-- Restore only after reviewing any subsequent schema/function changes.

CREATE OR REPLACE FUNCTION public.respond_listing_guest_quote(p_message_id uuid, p_access_key text, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.send_listing_guest_structured_message(p_thread_id uuid, p_access_key text, p_kind text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;
