-- Driver writes must pass the existing authenticated profile RPC or inspected server upload.
revoke insert, update on public.driver_profiles from anon, authenticated;
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
  if p_action='request_missing_document' and p_missing_document_type not in ('portrait','identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation') then
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
$function$;

revoke insert, update on public.driver_documents from anon, authenticated;
revoke all on function public.loadlink_replace_my_driver_document(text,text,text,text,bigint,text) from public, anon, authenticated;

-- Enforce the profile/document relationship even in trusted registration paths.
create or replace function private.loadlink_driver_document_owner_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if not exists(select 1 from public.driver_profiles p where p.id=new.profile_id and p.user_id=new.user_id) then
    raise exception 'Document owner does not match driver profile';
  end if;
  return new;
end; $$;
revoke all on function private.loadlink_driver_document_owner_guard() from public, anon, authenticated;
create trigger driver_document_owner_guard before insert or update on public.driver_documents
for each row execute function private.loadlink_driver_document_owner_guard();

create or replace function public.loadlink_register_driver_document_for_user(
  p_user_id uuid, p_document_type text, p_storage_path text, p_original_filename text,
  p_mime_type text, p_size_bytes bigint, p_sha256 text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_profile uuid; v_previous text; v_document public.driver_documents;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'Trusted upload service required'; end if;
  if p_document_type not in ('portrait','identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation') then raise exception 'Unsupported document type'; end if;
  if p_document_type='portrait' and p_mime_type not in ('image/jpeg','image/png') then raise exception 'Profile portrait must be a JPG or PNG'; end if;
  if p_storage_path not like p_user_id::text || '/' || p_document_type || '/%' then raise exception 'Invalid document path'; end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'Invalid document fingerprint'; end if;
  select id into v_profile from public.driver_profiles where user_id=p_user_id for update;
  if v_profile is null then raise exception 'Save your profile first'; end if;
  if not exists(select 1 from storage.objects where bucket_id='loadlink-driver-documents' and name=p_storage_path) then raise exception 'Uploaded document not found'; end if;
  select storage_path into v_previous from public.driver_documents where profile_id=v_profile and document_type=p_document_type;
  insert into public.driver_documents(profile_id,user_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256,validation_status)
  values(v_profile,p_user_id,p_document_type,p_storage_path,left(p_original_filename,180),p_mime_type,p_size_bytes,p_sha256,'validated')
  on conflict(profile_id,document_type) do update set storage_path=excluded.storage_path, original_filename=excluded.original_filename,
    mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,sha256=excluded.sha256,validation_status='validated',uploaded_at=now(),updated_at=now()
  returning * into v_document;
  if p_document_type='portrait' then update public.driver_profiles set profile_image_url='/api/phase2/portrait/'||v_profile::text where id=v_profile; end if;
  -- Any identity evidence replacement requires a fresh review before publication.
  if p_document_type in ('portrait','identity','drivers_licence','work_authorisation','prdp') then
    update public.driver_profiles set status=case when status='approved' then 'pending' else status end,
      approved_at=null,reviewed_at=null,reviewed_by=null,updated_at=now() where id=v_profile;
  end if;
  return jsonb_build_object('document',to_jsonb(v_document)-'storage_path'-'sha256','previousStoragePath',v_previous);
end; $$;
revoke all on function public.loadlink_register_driver_document_for_user(uuid,text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.loadlink_register_driver_document_for_user(uuid,text,text,text,text,bigint,text) to service_role;

create or replace function public.loadlink_driver_contact(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_profile public.driver_profiles;
begin
  if auth.uid() is null then raise exception 'Sign in to contact a driver' using errcode='28000'; end if;
  if exists(select 1 from public.user_moderation_profiles where user_id=auth.uid() and status in ('suspended','blocked')) then raise exception 'Account access is restricted' using errcode='42501'; end if;
  select * into v_profile from public.driver_profiles p where p.id=p_profile_id and p.status='approved'
    and (p.profile_expires_at is null or p.profile_expires_at>now())
    and not exists(select 1 from public.user_moderation_profiles m where m.user_id=p.user_id and m.status in ('suspended','blocked'));
  if not found then raise exception 'Driver profile is unavailable' using errcode='P0002'; end if;
  return jsonb_build_object('phone',v_profile.phone,'fullName',v_profile.full_name);
end; $$;
revoke all on function public.loadlink_driver_contact(uuid) from public,anon;
grant execute on function public.loadlink_driver_contact(uuid) to authenticated;

alter table public.driver_documents drop constraint driver_documents_document_type_check;
alter table public.driver_documents add constraint driver_documents_document_type_check check(document_type in ('portrait','identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation'));
alter table public.driver_profiles drop constraint driver_profiles_missing_document_type_check;
alter table public.driver_profiles add constraint driver_profiles_missing_document_type_check check(missing_document_type is null or missing_document_type in ('portrait','identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation'));

create table private.driver_identity_matches(
 profile_id uuid primary key references public.driver_profiles(id) on delete cascade,
 evidence jsonb not null, reviewed_by uuid not null references auth.users(id), reviewed_at timestamptz not null default now()
);
alter table private.driver_identity_matches enable row level security;
revoke all on private.driver_identity_matches from public,anon,authenticated;

create table private.driver_identity_review_events(
 id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.driver_profiles(id) on delete cascade,
 evidence jsonb not null,profile_snapshot jsonb not null,reviewed_by uuid not null references auth.users(id),reviewed_at timestamptz not null default now()
);
alter table private.driver_identity_review_events enable row level security;
revoke all on private.driver_identity_review_events from public,anon,authenticated;

create or replace function private.loadlink_driver_approval_identity_guard()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_evidence jsonb;
begin
 if new.status<>'approved' then return new; end if;
 -- Do not interrupt unrelated maintenance of already approved legacy rows.
 if tg_op='UPDATE' and old.status='approved' and new.profile_image_url is not distinct from old.profile_image_url and new.full_name is not distinct from old.full_name then return new; end if;
 if not exists(select 1 from public.driver_documents where profile_id=new.id and document_type='portrait' and mime_type in ('image/jpeg','image/png') and validation_status='validated')
 or not exists(select 1 from public.driver_documents where profile_id=new.id and document_type='identity' and validation_status='validated')
 or not exists(select 1 from public.driver_documents where profile_id=new.id and document_type='drivers_licence' and validation_status='validated')
 or (new.prdp_required and not exists(select 1 from public.driver_documents where profile_id=new.id and document_type='prdp' and validation_status='validated')) then
 raise exception 'A portrait, identity and licence evidence must be reviewed before approval'; end if;
 select jsonb_object_agg(document_type,sha256) into v_evidence from public.driver_documents where profile_id=new.id;
 if not exists(select 1 from private.driver_identity_matches where profile_id=new.id and evidence=v_evidence) then
 raise exception 'Confirm the portrait matches the identity document using the current evidence before approval'; end if;
 return new;
end; $$;
revoke all on function private.loadlink_driver_approval_identity_guard() from public,anon,authenticated;
create trigger driver_approval_identity_guard before insert or update on public.driver_profiles for each row execute function private.loadlink_driver_approval_identity_guard();

create or replace function public.loadlink_admin_review_driver_with_identity(p_profile_id uuid,p_action text,p_reason text default null,p_missing_document_type text default null,p_identity_match_confirmed boolean default false,p_expected_evidence jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_evidence jsonb; v_user uuid; v_snapshot jsonb;
begin
 if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then raise exception 'Verification permission required'; end if;
 select user_id,to_jsonb(p) into v_user,v_snapshot from public.driver_profiles p where id=p_profile_id for update;
 if v_user is null then raise exception 'Driver profile not found'; end if;
 if v_user=auth.uid() then raise exception 'You cannot verify your own driver profile'; end if;
 if p_action='approve' then
  if p_identity_match_confirmed is not true then raise exception 'Confirm the portrait matches the identity document'; end if;
  select jsonb_object_agg(document_type,sha256) into v_evidence from public.driver_documents where profile_id=p_profile_id;
  if v_evidence is distinct from p_expected_evidence then raise exception 'Evidence changed. Refresh and inspect the current documents before approving'; end if;
  insert into private.driver_identity_review_events(profile_id,evidence,profile_snapshot,reviewed_by) values(p_profile_id,v_evidence,v_snapshot,auth.uid());
  insert into private.driver_identity_matches(profile_id,evidence,reviewed_by) values(p_profile_id,coalesce(v_evidence,'{}'),auth.uid())
  on conflict(profile_id) do update set evidence=excluded.evidence,reviewed_by=excluded.reviewed_by,reviewed_at=now();
 end if;
 return public.loadlink_admin_review_driver_profile(p_profile_id,p_action,p_reason,p_missing_document_type);
end; $$;
revoke all on function public.loadlink_admin_review_driver_with_identity(uuid,text,text,text,boolean,jsonb) from public,anon;
grant execute on function public.loadlink_admin_review_driver_with_identity(uuid,text,text,text,boolean,jsonb) to authenticated;
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
  if not exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='portrait' and mime_type in ('image/jpeg','image/png') and validation_status='validated') then v_missing := array_append(v_missing, 'clear profile photo'); end if;
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
$function$;


alter table public.driver_profile_reviews drop constraint driver_profile_reviews_missing_document_type_check;
alter table public.driver_profile_reviews add constraint driver_profile_reviews_missing_document_type_check check(missing_document_type is null or missing_document_type in ('portrait','identity','drivers_licence','prdp','cv','driving_certificate','work_authorisation'));

create table private.driver_evidence_budget(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null,attempts integer not null);
alter table private.driver_evidence_budget enable row level security;
revoke all on private.driver_evidence_budget from public,anon,authenticated;
create or replace function public.loadlink_reserve_driver_evidence_attempt(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Trusted upload service required'; end if;
 insert into private.driver_evidence_budget(user_id,window_start,attempts) values(p_user_id,now(),1)
 on conflict(user_id) do update set attempts=case when driver_evidence_budget.window_start<now()-interval '10 minutes' then 1 else driver_evidence_budget.attempts+1 end,
 window_start=case when driver_evidence_budget.window_start<now()-interval '10 minutes' then now() else driver_evidence_budget.window_start end returning attempts into v_count;
 return v_count<=12;
end; $$;
revoke all on function public.loadlink_reserve_driver_evidence_attempt(uuid) from public,anon,authenticated;
grant execute on function public.loadlink_reserve_driver_evidence_attempt(uuid) to service_role;
