-- Keep identity and work evidence mandatory while allowing identity documents without passport metadata.
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
    if v_profile.passport_expiry is not null and v_profile.passport_expiry < (now() at time zone 'Africa/Johannesburg')::date then v_missing := array_append(v_missing, 'valid passport expiry'); end if;
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
create or replace function private.loadlink_check_driver_work_evidence() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and new.citizenship_status='foreign_national' then
  if nullif(trim(new.nationality),'') is null or (new.passport_expiry is not null and new.passport_expiry < (now() at time zone 'Africa/Johannesburg')::date) then raise exception 'Nationality and a current identity document are required'; end if;
  if new.work_authorisation_type is null or (new.work_authorisation_type <> 'permanent_residence' and (new.work_authorisation_expiry is null or new.work_authorisation_expiry < (now() at time zone 'Africa/Johannesburg')::date)) then raise exception 'Current work authorisation is required'; end if;
  if not exists(select 1 from public.driver_documents where profile_id=new.id and document_type='work_authorisation' and validation_status='validated') then raise exception 'Review the work authorisation document before approval'; end if;
 end if;
 return new;
end $$;
revoke all on function private.loadlink_check_driver_work_evidence() from public, anon, authenticated;
