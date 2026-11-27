-- Keep completed work in History without violating the lifecycle check.
-- Close abandoned in-app call sessions to unblock subsequent call attempts.
-- Include legacy asset records in vehicle moderation and legitimate matching prices.

CREATE OR REPLACE FUNCTION public.loadlink_archive_closed_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 update public.job_listings
 set status='closed', lifecycle_status='archived'
 where id=new.listing_id and user_id=new.closed_by;
 return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.loadlink_start_call_session(p_conversation_id uuid, p_callee_user_id uuid)
 RETURNS TABLE(session_id uuid, max_seconds integer, remaining_seconds integer, premium boolean, started_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_caller uuid := auth.uid();
  v_caller_plan text := 'standard';
  v_premium boolean := false;
  v_limit integer := 900;
  v_id uuid;
  v_started timestamptz;
begin
  if v_caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_conversation_id is null or p_callee_user_id is null or p_callee_user_id = v_caller then raise exception 'INVALID_CALL'; end if;

  v_caller_plan := coalesce(public.loadlink_active_plan(v_caller),'standard');
  if not exists(select 1 from public.profiles p where p.id = p_callee_user_id) then raise exception 'CALL_USER_NOT_FOUND'; end if;

  update public.call_sessions s
     set ended_at = least(now(), s.started_at + make_interval(secs => s.max_seconds)),
         status = 'limit_reached',
         end_reason = 'server_limit'
   where s.conversation_id = p_conversation_id
     and s.status = 'active'
     and s.plan_at_start not in ('pro','dealer')
     and now() >= s.started_at + make_interval(secs => s.max_seconds);

  -- Closed browser tabs can leave active sessions behind. Expire only stale
  -- sessions for this conversation, without touching recently heartbeating calls.
  update public.call_sessions s
     set status='ended', ended_at=now(), end_reason='connection_lost'
   where s.conversation_id=p_conversation_id
     and s.status='active'
     and s.last_heartbeat_at < now()-interval '90 seconds';

  if exists(
    select 1 from public.call_sessions s
    where s.conversation_id = p_conversation_id
      and s.status = 'active'
      and (s.caller_user_id in (v_caller,p_callee_user_id) or s.callee_user_id in (v_caller,p_callee_user_id))
  ) then raise exception 'CALL_ALREADY_ACTIVE'; end if;

  v_premium := v_caller_plan in ('pro','dealer');
  -- Keep the stored value inside the table's safety constraint. Premium sessions
  -- are not time-limited by this value; heartbeat/end logic keys off plan_at_start.
  v_limit := case when v_premium then 14400 else 900 end;

  insert into public.call_sessions(conversation_id,caller_user_id,callee_user_id,plan_at_start,max_seconds)
  values(p_conversation_id,v_caller,p_callee_user_id,case when v_premium then v_caller_plan else 'standard' end,v_limit)
  returning id,call_sessions.started_at into v_id,v_started;

  return query select v_id,v_limit,v_limit,v_premium,v_started;
end;
$function$;

CREATE OR REPLACE FUNCTION public.loadlink_admin_listing_queue(p_status text DEFAULT 'pending'::text, p_kind text DEFAULT 'all'::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then
    raise exception 'Admin permission required';
  end if;
  if coalesce(p_status,'pending') not in ('all','pending','approved','rejected') then
    raise exception 'Invalid moderation status';
  end if;
  if coalesce(p_kind,'all') not in ('all','job','contract','vehicle') then
    raise exception 'Invalid listing type';
  end if;

  return query
  select jsonb_build_object(
    'id', j.id,
    'title', j.title,
    'city', j.city,
    'listing_kind', j.listing_kind,
    'vehicle_group', j.vehicle_group,
    'rate', j.rate,
    'posted_by', j.posted_by,
    'user_id', j.user_id,
    'owner_name', coalesce(nullif(trim(p.full_name),''), nullif(trim(p.company_name),''), j.posted_by),
    'owner_email', p.email,
    'package_type', j.package_type,
    'photos', coalesce(j.photos,'{}'::text[]),
    'description', j.description,
    'moderation_status', j.moderation_status,
    'moderation_notes', j.moderation_notes,
    'rejection_reason', j.rejection_reason,
    'status', j.status,
    'lifecycle_status', j.lifecycle_status,
    'stock_status', j.stock_status,
    'dealership_id', j.dealership_id,
    'dealership_name', dp.name,
    'dealership_verification_status', dp.verification_status,
    'dealership_platform_status', dp.platform_status,
    'created_at', j.created_at,
    'expires_at', j.expires_at,
    'verification_id', vv.id,
    'vehicle_verification_status', vv.status,
    'id_document_path', vv.id_document_path,
    'licence_document_path', vv.licence_document_path,
    'registration_document_path', vv.registration_document_path,
    'ownership_document_path', vv.ownership_document_path,
    'company_registration_document_path', vv.company_registration_document_path,
    'tax_document_path', vv.tax_document_path,
    'business_address_document_path', vv.business_address_document_path,
    'representative_authority_document_path', vv.representative_authority_document_path, 'face_portrait_path', vv.face_portrait_path, 'face_video_path', vv.face_video_path, 'face_review_mode', vv.face_review_mode, 'face_consent_at', vv.face_consent_at
  )
  from public.job_listings j
  left join public.profiles p on p.id=j.user_id
  left join public.vehicle_verifications vv on vv.listing_id=j.id
  left join public.dealership_profiles dp on dp.id=j.dealership_id
  where (coalesce(p_status,'pending')='all' or j.moderation_status=coalesce(p_status,'pending'))
    and (coalesce(p_kind,'all')='all' or j.listing_kind=coalesce(p_kind,'all') or (coalesce(p_kind,'all')='vehicle' and j.listing_kind='asset'))
  order by case when j.moderation_status='pending' then 0 else 1 end, j.created_at asc
  limit greatest(1,least(coalesce(p_limit,100),200))
  offset greatest(0,coalesce(p_offset,0));
end;
$function$;

CREATE OR REPLACE FUNCTION public.loadlink_vehicle_market_recommendation(p_brand text, p_model text, p_year integer, p_condition text DEFAULT 'Good'::text, p_odometer_km integer DEFAULT NULL::integer, p_body_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
with raw as (
  select j.id,
    coalesce(nullif(j.brand,''),(regexp_match(coalesce(j.description,''),'(?im)^Make:\s*([^\n]+)'))[1]) as make,
    coalesce(nullif(j.model,''),(regexp_match(coalesce(j.description,''),'(?im)^Model:\s*([^\n]+)'))[1]) as mdl,
    coalesce(j.vehicle_year,nullif((regexp_match(coalesce(j.description,''),'(?im)^Year:\s*(\d{4})'))[1],'')::int) as yr,
    coalesce(nullif(j.condition,''),(regexp_match(coalesce(j.description,''),'(?im)^Condition:\s*([^\n]+)'))[1],'Good') as cond,
    coalesce(j.odometer_km,nullif(regexp_replace(coalesce((regexp_match(coalesce(j.description,''),'(?im)^Mileage:\s*([^\n]+)'))[1],''),'[^0-9]','','g'),'')::int) as km,
    coalesce(nullif(j.body_type,''),(regexp_match(coalesce(j.description,''),'(?im)^Vehicle subtype:\s*([^\n]+)'))[1]) as body,
    coalesce(j.price_amount,nullif(regexp_replace(coalesce((regexp_match(coalesce(j.description,''),'(?im)^Sale price:\s*([^\n]+)'))[1],''),'[^0-9.]','','g'),'')::numeric) as price
  from public.job_listings j
  where j.listing_kind in ('vehicle','asset') and j.status='active' and j.moderation_status='approved'
    and coalesce(j.description,'') ~* '^Offer:\s*(For sale only|Sale or rental)'
), comps as (
  select *,
    price *
    (case lower(coalesce(p_condition,'good')) when 'excellent' then 1.08 when 'very good' then 1.04 when 'good' then 1.0 when 'fair' then .90 when 'poor' then .75 else 1.0 end) /
    (case lower(coalesce(cond,'good')) when 'excellent' then 1.08 when 'very good' then 1.04 when 'good' then 1.0 when 'fair' then .90 when 'poor' then .75 else 1.0 end) *
    greatest(.86,least(1.14,1 + .04*(coalesce(p_year,yr)-yr))) *
    case when p_odometer_km is null or km is null then 1 else greatest(.88,least(1.12,1 + ((km-p_odometer_km)::numeric/100000)*.025)) end as adjusted_price
  from raw
  where price between 10000 and 50000000
    and lower(trim(make))=lower(trim(coalesce(p_brand,'')))
    and lower(trim(mdl))=lower(trim(coalesce(p_model,'')))
    and (p_year is null or yr between p_year-3 and p_year+3)
    and (p_body_type is null or btrim(p_body_type)='' or body is null or lower(trim(body))=lower(trim(p_body_type)))
), agg as (
 select count(*)::int n,
        percentile_cont(.25) within group(order by adjusted_price)::numeric low,
        percentile_cont(.5) within group(order by adjusted_price)::numeric median,
        percentile_cont(.75) within group(order by adjusted_price)::numeric high
 from comps
)
select case when n>=3 then jsonb_build_object('available',true,'sample_count',n,'low_cents',round(low*100),'recommended_cents',round(median*100),'high_cents',round(high*100),'confidence',case when n>=8 then 'high' when n>=5 then 'medium' else 'early' end,'basis','Approved LoadLink sale listings matched by make, model, year, body type, condition and mileage') else jsonb_build_object('available',false,'sample_count',n,'reason','Not enough approved comparable LoadLink sale listings yet') end from agg;
$function$;
