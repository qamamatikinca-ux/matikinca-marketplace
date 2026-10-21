create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
-- Private application fields: driver_profiles is owner/staff-only; public RPC has an explicit safe projection.
alter table public.driver_profiles
 add column if not exists citizenship_status text,
 add column if not exists nationality text,
 add column if not exists passport_expiry date,
 add column if not exists work_authorisation_type text,
 add column if not exists work_authorisation_expiry date;
alter table public.driver_profiles add constraint driver_citizenship_check check (citizenship_status is null or citizenship_status in ('south_african','foreign_national'));
alter table public.driver_profiles add constraint driver_work_authorisation_check check (work_authorisation_type is null or work_authorisation_type in ('work_visa','permanent_residence','other_authorisation'));
alter table public.driver_documents drop constraint driver_documents_document_type_check;
alter table public.driver_documents add constraint driver_documents_document_type_check check (document_type in ('identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation'));
alter table public.driver_profiles drop constraint driver_profiles_missing_document_type_check;
alter table public.driver_profiles add constraint driver_profiles_missing_document_type_check check (missing_document_type is null or missing_document_type in ('identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation'));
alter table public.driver_profile_reviews drop constraint driver_profile_reviews_missing_document_type_check;
alter table public.driver_profile_reviews add constraint driver_profile_reviews_missing_document_type_check check (missing_document_type is null or missing_document_type in ('identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation'));
CREATE OR REPLACE FUNCTION public.loadlink_upsert_my_driver_profile(p_payload jsonb)
 RETURNS driver_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_existing public.driver_profiles;
  v_row public.driver_profiles;
  v_vehicle_types text[] := '{}';
  v_routes text[] := '{}';
  v_languages text[] := '{}';
  v_status text := 'draft';
  v_years integer := 0;
  v_prdp_expiry date := null;
begin
  if v_user is null then raise exception 'Sign in required'; end if;

  if jsonb_typeof(p_payload->'vehicle_types') = 'array' then
    select coalesce(array_agg(left(trim(value), 100)) filter (where trim(value) <> ''), '{}')
      into v_vehicle_types from jsonb_array_elements_text(p_payload->'vehicle_types');
  end if;
  if jsonb_typeof(p_payload->'route_experience') = 'array' then
    select coalesce(array_agg(left(trim(value), 100)) filter (where trim(value) <> ''), '{}')
      into v_routes from jsonb_array_elements_text(p_payload->'route_experience');
  end if;
  if jsonb_typeof(p_payload->'languages') = 'array' then
    select coalesce(array_agg(left(trim(value), 60)) filter (where trim(value) <> ''), '{}')
      into v_languages from jsonb_array_elements_text(p_payload->'languages');
  end if;

  if coalesce(p_payload->>'years_experience', '') ~ '^[0-9]{1,2}$' then
    v_years := greatest(0, least(60, (p_payload->>'years_experience')::integer));
  end if;

  if coalesce(p_payload->>'prdp_expiry', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    v_prdp_expiry := (p_payload->>'prdp_expiry')::date;
  end if;

  select * into v_existing from public.driver_profiles where user_id = v_user;
  if found then
    v_status := case
      when v_existing.status = 'approved' then 'pending'
      when v_existing.status = 'rejected' then 'draft'
      else coalesce(v_existing.status, 'draft')
    end;
  end if;

  insert into public.driver_profiles (
    user_id, full_name, headline, city, province, phone, email,
    years_experience, licence_code, prdp_required, prdp_expiry,
    vehicle_types, route_experience, languages, previous_roles,
    availability, bio, status, review_reason, missing_document_type, updated_at
  ) values (
    v_user,
    left(trim(coalesce(p_payload->>'full_name', '')), 140),
    left(trim(coalesce(p_payload->>'headline', '')), 180),
    left(trim(coalesce(p_payload->>'city', '')), 100),
    left(trim(coalesce(p_payload->>'province', '')), 100),
    left(trim(coalesce(p_payload->>'phone', '')), 40),
    left(trim(coalesce(p_payload->>'email', '')), 180),
    v_years,
    left(trim(coalesce(p_payload->>'licence_code', '')), 40),
    case when lower(coalesce(p_payload->>'prdp_required', 'false')) in ('true','1','yes','on') then true else false end,
    v_prdp_expiry,
    v_vehicle_types,
    v_routes,
    v_languages,
    left(trim(coalesce(p_payload->>'previous_roles', '')), 3000),
    left(trim(coalesce(p_payload->>'availability', 'Available immediately')), 180),
    left(trim(coalesce(p_payload->>'bio', '')), 2000),
    v_status,
    case when v_status = 'draft' then null else v_existing.review_reason end,
    case when v_status = 'draft' then null else v_existing.missing_document_type end,
    now()
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    headline = excluded.headline,
    city = excluded.city,
    province = excluded.province,
    phone = excluded.phone,
    email = excluded.email,
    years_experience = excluded.years_experience,
    licence_code = excluded.licence_code,
    prdp_required = excluded.prdp_required,
    prdp_expiry = excluded.prdp_expiry,
    vehicle_types = excluded.vehicle_types,
    route_experience = excluded.route_experience,
    languages = excluded.languages,
    previous_roles = excluded.previous_roles,
    availability = excluded.availability,
    bio = excluded.bio,
    status = excluded.status,
    review_reason = excluded.review_reason,
    missing_document_type = excluded.missing_document_type,
    approved_at = case when excluded.status = 'pending' then null else driver_profiles.approved_at end,
    updated_at = now()
  returning * into v_row;

  if p_payload ? 'citizenship_status' then
    if coalesce(p_payload->>'citizenship_status','') not in ('south_african','foreign_national') then raise exception 'Choose your citizenship status'; end if;
    update public.driver_profiles set
      citizenship_status = p_payload->>'citizenship_status',
      nationality = case when p_payload->>'citizenship_status'='foreign_national' then left(nullif(trim(p_payload->>'nationality'),''),100) else null end,
      passport_expiry = case when p_payload->>'citizenship_status'='foreign_national' then nullif(p_payload->>'passport_expiry','')::date else null end,
      work_authorisation_type = case when p_payload->>'citizenship_status'='foreign_national' then nullif(p_payload->>'work_authorisation_type','') else null end,
      work_authorisation_expiry = case when p_payload->>'citizenship_status'='foreign_national' and p_payload->>'work_authorisation_type'<>'permanent_residence' then nullif(p_payload->>'work_authorisation_expiry','')::date else null end
    where id=v_row.id returning * into v_row;
  end if;
  return v_row;
exception
  when invalid_text_representation or datetime_field_overflow then
    raise exception 'Check the experience, PrDP and date values and try again';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.loadlink_replace_my_driver_document(p_document_type text, p_storage_path text, p_original_filename text, p_mime_type text, p_size_bytes bigint, p_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_profile uuid;
  v_previous text;
  v_document public.driver_documents;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if p_document_type not in ('identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation') then
    raise exception 'Unsupported document type';
  end if;
  if p_mime_type not in ('application/pdf','image/jpeg','image/png') then
    raise exception 'Unsupported document format';
  end if;
  if p_size_bytes < 1 or p_size_bytes > 8388608 then
    raise exception 'Documents must be smaller than 8 MB';
  end if;
  if p_storage_path not like v_user::text || '/%' then
    raise exception 'Invalid document path';
  end if;

  select id into v_profile from public.driver_profiles where user_id = v_user;
  if v_profile is null then raise exception 'Save your profile first'; end if;

  if not exists(select 1 from storage.objects where bucket_id='loadlink-driver-documents' and name=p_storage_path and (storage.foldername(name))[1]=v_user::text) then raise exception 'Uploaded document not found'; end if;
  select storage_path into v_previous
  from public.driver_documents
  where profile_id = v_profile and document_type = p_document_type;

  insert into public.driver_documents (
    profile_id, user_id, document_type, storage_path, original_filename,
    mime_type, size_bytes, sha256, uploaded_at
  ) values (
    v_profile, v_user, p_document_type, left(p_storage_path, 700),
    left(p_original_filename, 180), p_mime_type, p_size_bytes,
    left(p_sha256, 128), now()
  )
  on conflict (profile_id, document_type) do update set
    user_id = excluded.user_id,
    storage_path = excluded.storage_path,
    original_filename = excluded.original_filename,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    sha256 = excluded.sha256,
    uploaded_at = now()
  returning * into v_document;

  return jsonb_build_object(
    'document', to_jsonb(v_document) - 'storage_path' - 'sha256',
    'previousStoragePath', v_previous
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.loadlink_save_and_submit_my_driver_profile(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_profile public.driver_profiles;
  v_has_identity boolean := false;
  v_has_licence boolean := false;
  v_has_prdp boolean := false;
  v_missing text[] := '{}';
begin
  if v_user is null then raise exception 'Sign in required'; end if;

  v_profile := public.loadlink_upsert_my_driver_profile(coalesce(p_payload, '{}'::jsonb));

  select * into v_profile
  from public.driver_profiles
  where user_id = v_user
  for update;

  if not found then
    raise exception 'DRIVER_PROFILE_INCOMPLETE: profile information was not saved';
  end if;

  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='identity') into v_has_identity;
  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='drivers_licence') into v_has_licence;
  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='prdp') into v_has_prdp;

  if trim(coalesce(v_profile.full_name, '')) = '' then v_missing := array_append(v_missing, 'full name'); end if;
  if trim(coalesce(v_profile.city, '')) = '' then v_missing := array_append(v_missing, 'city or town'); end if;
  if trim(coalesce(v_profile.province, '')) = '' then v_missing := array_append(v_missing, 'province'); end if;
  if trim(coalesce(v_profile.phone, '')) = '' then v_missing := array_append(v_missing, 'contact number'); end if;
  if trim(coalesce(v_profile.email, '')) = '' then v_missing := array_append(v_missing, 'email'); end if;
  if trim(coalesce(v_profile.licence_code, '')) = '' then v_missing := array_append(v_missing, 'licence code'); end if;
  if cardinality(coalesce(v_profile.vehicle_types, '{}'::text[])) = 0 then v_missing := array_append(v_missing, 'vehicle experience'); end if;
  if not v_has_identity then v_missing := array_append(v_missing, 'ID or passport'); end if;
  if not v_has_licence then v_missing := array_append(v_missing, 'driver''s licence'); end if;
  if v_profile.prdp_required and not v_has_prdp then v_missing := array_append(v_missing, 'PrDP'); end if;

  if v_profile.citizenship_status is null then v_missing := array_append(v_missing, 'citizenship status'); end if;
  if v_profile.citizenship_status='foreign_national' then
    if nullif(trim(v_profile.nationality),'') is null then v_missing := array_append(v_missing, 'nationality'); end if;
    if v_profile.passport_expiry is null or v_profile.passport_expiry < (now() at time zone 'Africa/Johannesburg')::date then v_missing := array_append(v_missing, 'valid passport expiry'); end if;
    if v_profile.work_authorisation_type is null then v_missing := array_append(v_missing, 'work authorisation type'); end if;
    if v_profile.work_authorisation_type is distinct from 'permanent_residence' and (v_profile.work_authorisation_expiry is null or v_profile.work_authorisation_expiry < (now() at time zone 'Africa/Johannesburg')::date) then v_missing := array_append(v_missing, 'valid work authorisation expiry'); end if;
    if not exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='work_authorisation' and validation_status='validated') then v_missing := array_append(v_missing, 'work authorisation document'); end if;
  end if;
  if cardinality(v_missing) > 0 then
    raise exception 'DRIVER_PROFILE_INCOMPLETE: %', array_to_string(v_missing, ', ');
  end if;

  update public.driver_profiles
  set status='pending', submitted_at=now(), approved_at=null,
      reviewed_at=null, reviewed_by=null, review_reason=null,
      missing_document_type=null, updated_at=now()
  where id=v_profile.id and user_id=v_user;

  if not found then raise exception 'Driver profile state could not be updated'; end if;

  return jsonb_build_object('ok', true, 'status', 'pending', 'profileId', v_profile.id, 'submittedAt', now());
end;
$function$
;

-- Enforce the same rule for every staff approval path, including legacy review RPCs.
create or replace function private.loadlink_check_driver_work_evidence() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and new.citizenship_status='foreign_national' then
  if nullif(trim(new.nationality),'') is null or new.passport_expiry is null or new.passport_expiry < (now() at time zone 'Africa/Johannesburg')::date then raise exception 'A current passport and nationality are required'; end if;
  if new.work_authorisation_type is null or (new.work_authorisation_type <> 'permanent_residence' and (new.work_authorisation_expiry is null or new.work_authorisation_expiry < (now() at time zone 'Africa/Johannesburg')::date)) then raise exception 'Current work authorisation is required'; end if;
  if not exists(select 1 from public.driver_documents where profile_id=new.id and document_type='work_authorisation' and validation_status='validated') then raise exception 'Review the work authorisation document before approval'; end if;
 end if;
 return new;
end $$;
revoke all on function private.loadlink_check_driver_work_evidence() from public, anon, authenticated;
create trigger driver_work_evidence_before_approval before insert or update on public.driver_profiles for each row execute function private.loadlink_check_driver_work_evidence();

update storage.buckets set file_size_limit=8388608 where id='loadlink-driver-documents' and (file_size_limit is null or file_size_limit>8388608);

CREATE OR REPLACE FUNCTION public.loadlink_admin_review_driver_profile(p_profile_id uuid, p_action text, p_reason text DEFAULT NULL::text, p_missing_document_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_profile public.driver_profiles%rowtype;
  v_status text;
  v_title text;
  v_message text;
begin
  perform public.loadlink_phase2_require_admin(array['owner','admin','operations','verification','moderator']);
  if p_action not in ('approve','reject','request_missing_document','suspend','restore') then
    raise exception 'INVALID_DRIVER_REVIEW_ACTION';
  end if;
  if p_action in ('reject','suspend') and char_length(btrim(coalesce(p_reason,'')))<5 then
    raise exception 'REASON_REQUIRED';
  end if;
  if p_action='request_missing_document' and p_missing_document_type not in ('identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation') then
    raise exception 'VALID_MISSING_DOCUMENT_REQUIRED';
  end if;

  select * into v_profile from public.driver_profiles where id=p_profile_id for update;
  if not found then raise exception 'DRIVER_PROFILE_NOT_FOUND'; end if;

  if p_action='approve' then
    if not exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='identity' and validation_status='validated') then raise exception 'IDENTITY_DOCUMENT_REQUIRED'; end if;
    if not exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='drivers_licence' and validation_status='validated') then raise exception 'DRIVERS_LICENCE_REQUIRED'; end if;
    if v_profile.prdp_required and not exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='prdp' and validation_status='validated') then raise exception 'PRDP_REQUIRED'; end if;
    if (coalesce(v_profile.licence_expires_at,v_profile.licence_expiry) is not null and coalesce(v_profile.licence_expires_at,v_profile.licence_expiry)<current_date) then raise exception 'DRIVERS_LICENCE_EXPIRED';end if;
     if v_profile.prdp_required and (coalesce(v_profile.prdp_expires_at,v_profile.prdp_expiry) is not null and coalesce(v_profile.prdp_expires_at,v_profile.prdp_expiry)<current_date) then raise exception 'PRDP_EXPIRED';end if;
     v_status:='approved'; v_title:='Driver profile approved'; v_message:='Your driver profile is now visible in Drivers Available for Work.';
  elsif p_action='reject' then
    v_status:='rejected'; v_title:='Driver profile needs changes'; v_message:=btrim(p_reason);
  elsif p_action='request_missing_document' then
    v_status:='rejected'; v_title:='One document is required'; v_message:='Please upload the requested '||replace(p_missing_document_type,'_',' ')||' document and resubmit your profile.';
  elsif p_action='suspend' then
    v_status:='suspended'; v_title:='Driver profile suspended'; v_message:=btrim(p_reason);
  else
    v_status:='approved'; v_title:='Driver profile restored'; v_message:='Your driver profile is visible again.';
  end if;

  update public.driver_profiles set
    status=v_status,
    review_reason=case when p_action in ('reject','suspend') then btrim(p_reason) else null end,
    missing_document_type=case when p_action='request_missing_document' then p_missing_document_type else null end,
    reviewed_by=auth.uid(),reviewed_at=now(),
    profile_status=case when v_status='approved' then 'active' when v_status='suspended' then 'suspended' when v_status='rejected' then 'rejected' else profile_status end,
     verification_level=case when v_status='approved' then 'documents_checked' else verification_level end,
     approved_at=case when v_status='approved' then now() when v_status IN ('rejected','suspended') then null else approved_at end,
     published_at=case when v_status='approved' then coalesce(published_at,now()) else published_at end,
    updated_at=now()
  where id=v_profile.id;

  insert into public.driver_profile_reviews(profile_id,action,reason,missing_document_type,actor_id)
  values(
    v_profile.id,
    case p_action when 'approve' then 'approved' when 'reject' then 'rejected'
      when 'request_missing_document' then 'missing_document_requested'
      when 'suspend' then 'suspended' else 'restored' end,
    nullif(btrim(coalesce(p_reason,'')),''),
    case when p_action='request_missing_document' then p_missing_document_type else null end,
    auth.uid()
  );

  perform public.loadlink_phase2_enqueue_notification(
    v_profile.user_id,'driver_profile_'||p_action,v_title,v_message,'/driver-profile','driver_profile',v_profile.id,
    'driver-profile-review:'||v_profile.id::text||':'||p_action||':'||extract(epoch from clock_timestamp())::bigint::text,
    jsonb_build_object('status',v_status,'missingDocumentType',p_missing_document_type)
  );
  perform public.loadlink_phase2_flush_notification_outbox(10);

  return jsonb_build_object('id',v_profile.id,'status',v_status,'action',p_action);
end;
$function$
;
