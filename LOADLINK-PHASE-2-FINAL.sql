-- LOADLINK PHASE 2 — FINAL WEBSITE SUPPORT
-- Run this file in the Supabase SQL Editor after the existing LoadLink SQL files.
-- It is additive and safe to run again. It does not delete users, listings or chats.
-- Features: professional profile settings, driver profiles/documents, voice notes,
-- chat blocking, moderation-aware marketplace capabilities and driver review.

create extension if not exists pgcrypto;
grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. PROFESSIONAL ACCOUNT SETTINGS
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  subscription_plan text not null default 'standard',
  last_seen timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists whatsapp_number text,
  add column if not exists company_name text,
  add column if not exists job_title text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists verification_status text not null default 'not_started',
  add column if not exists subscription_plan text not null default 'standard',
  add column if not exists email_notifications boolean not null default true,
  add column if not exists chat_notifications boolean not null default true,
  add column if not exists listing_notifications boolean not null default true,
  add column if not exists marketing_notifications boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.loadlink_update_my_profile(p_payload jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_row public.profiles;
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  insert into public.profiles (
    id, full_name, phone, whatsapp_number, company_name, job_title, city,
    province, bio, avatar_url, email_notifications, chat_notifications,
    listing_notifications, marketing_notifications, updated_at
  ) values (
    v_user,
    left(trim(coalesce(p_payload->>'full_name', '')), 140),
    left(trim(coalesce(p_payload->>'phone', '')), 40),
    left(trim(coalesce(p_payload->>'whatsapp_number', '')), 40),
    left(trim(coalesce(p_payload->>'company_name', '')), 160),
    left(trim(coalesce(p_payload->>'job_title', '')), 120),
    left(trim(coalesce(p_payload->>'city', '')), 100),
    left(trim(coalesce(p_payload->>'province', '')), 100),
    left(trim(coalesce(p_payload->>'bio', '')), 1200),
    left(trim(coalesce(p_payload->>'avatar_url', '')), 1000),
    coalesce((p_payload->>'email_notifications')::boolean, true),
    coalesce((p_payload->>'chat_notifications')::boolean, true),
    coalesce((p_payload->>'listing_notifications')::boolean, true),
    coalesce((p_payload->>'marketing_notifications')::boolean, false),
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    whatsapp_number = excluded.whatsapp_number,
    company_name = excluded.company_name,
    job_title = excluded.job_title,
    city = excluded.city,
    province = excluded.province,
    bio = excluded.bio,
    avatar_url = excluded.avatar_url,
    email_notifications = excluded.email_notifications,
    chat_notifications = excluded.chat_notifications,
    listing_notifications = excluded.listing_notifications,
    marketing_notifications = excluded.marketing_notifications,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.loadlink_update_my_profile(jsonb) from public;
grant execute on function public.loadlink_update_my_profile(jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile media owner insert" on storage.objects;
create policy "profile media owner insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile media owner update" on storage.objects;
create policy "profile media owner update"
on storage.objects for update to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile media owner delete" on storage.objects;
create policy "profile media owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 2. DRIVER OPPORTUNITY PROFILES
-- ---------------------------------------------------------------------------

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  city text not null default '',
  province text not null default '',
  phone text not null default '',
  email text not null default '',
  years_experience integer not null default 0 check (years_experience between 0 and 60),
  licence_code text not null default '',
  prdp_required boolean not null default false,
  prdp_expiry date,
  vehicle_types text[] not null default '{}',
  route_experience text[] not null default '{}',
  languages text[] not null default '{}',
  previous_roles text not null default '',
  availability text not null default 'Available immediately',
  bio text not null default '',
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  review_reason text,
  missing_document_type text,
  submitted_at timestamptz,
  approved_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.driver_profiles
  add column if not exists headline text not null default '',
  add column if not exists city text not null default '',
  add column if not exists province text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists years_experience integer not null default 0,
  add column if not exists licence_code text not null default '',
  add column if not exists prdp_required boolean not null default false,
  add column if not exists prdp_expiry date,
  add column if not exists vehicle_types text[] not null default '{}',
  add column if not exists route_experience text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists previous_roles text not null default '',
  add column if not exists availability text not null default 'Available immediately',
  add column if not exists bio text not null default '',
  add column if not exists status text not null default 'draft',
  add column if not exists review_reason text,
  add column if not exists missing_document_type text,
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.driver_profiles(id) on delete cascade,
  document_type text not null check (document_type in ('identity','drivers_licence','prdp','cv','driving_certificate')),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 8388608),
  sha256 text not null,
  uploaded_at timestamptz not null default now(),
  unique (profile_id, document_type)
);

create index if not exists driver_profiles_public_idx
  on public.driver_profiles(status, updated_at desc);
create index if not exists driver_profiles_location_idx
  on public.driver_profiles(city, province);
create index if not exists driver_documents_profile_idx
  on public.driver_documents(profile_id, document_type);

alter table public.driver_profiles enable row level security;
alter table public.driver_documents enable row level security;

drop policy if exists "drivers read own profile" on public.driver_profiles;
create policy "drivers read own profile"
on public.driver_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "drivers read own documents" on public.driver_documents;
create policy "drivers read own documents"
on public.driver_documents for select to authenticated
using (exists (
  select 1 from public.driver_profiles p
  where p.id = driver_documents.profile_id and p.user_id = auth.uid()
));

grant select on public.driver_profiles, public.driver_documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'loadlink-driver-documents',
  'loadlink-driver-documents',
  false,
  8388608,
  array['application/pdf','image/jpeg','image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "driver document owner insert" on storage.objects;
create policy "driver document owner insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'loadlink-driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "driver document owner read" on storage.objects;
create policy "driver document owner read"
on storage.objects for select to authenticated
using (bucket_id = 'loadlink-driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "driver document owner delete" on storage.objects;
create policy "driver document owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'loadlink-driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.loadlink_phase2_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin boolean := false;
begin
  if lower(coalesce(auth.jwt()->>'email', '')) = 'loadlinksouthafrica@gmail.com' then
    return true;
  end if;

  if to_regclass('public.admin_users') is not null and auth.uid() is not null then
    execute 'select exists(select 1 from public.admin_users where user_id = $1 and is_active = true)'
      into v_admin using auth.uid();
  end if;
  return coalesce(v_admin, false);
end;
$$;

revoke all on function public.loadlink_phase2_is_admin() from public;
grant execute on function public.loadlink_phase2_is_admin() to authenticated;

create or replace function public.loadlink_upsert_my_driver_profile(p_payload jsonb)
returns public.driver_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_existing public.driver_profiles;
  v_row public.driver_profiles;
  v_vehicle_types text[] := '{}';
  v_routes text[] := '{}';
  v_languages text[] := '{}';
  v_status text := 'draft';
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

  select * into v_existing from public.driver_profiles where user_id = v_user;
  if found then
    v_status := case
      when v_existing.status = 'approved' then 'pending'
      when v_existing.status = 'rejected' then 'draft'
      else v_existing.status
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
    greatest(0, least(60, coalesce(nullif(p_payload->>'years_experience','')::integer, 0))),
    left(trim(coalesce(p_payload->>'licence_code', '')), 40),
    coalesce(nullif(p_payload->>'prdp_required','')::boolean, false),
    nullif(p_payload->>'prdp_expiry','')::date,
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

  return v_row;
exception
  when invalid_text_representation or datetime_field_overflow then
    raise exception 'Check the experience, PrDP and date values and try again';
end;
$$;

revoke all on function public.loadlink_upsert_my_driver_profile(jsonb) from public;
grant execute on function public.loadlink_upsert_my_driver_profile(jsonb) to authenticated;

create or replace function public.loadlink_replace_my_driver_document(
  p_document_type text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_profile uuid;
  v_previous text;
  v_document public.driver_documents;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if p_document_type not in ('identity','drivers_licence','prdp','cv','driving_certificate') then
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

  select storage_path into v_previous
  from public.driver_documents
  where profile_id = v_profile and document_type = p_document_type;

  insert into public.driver_documents (
    profile_id, document_type, storage_path, original_filename,
    mime_type, size_bytes, sha256, uploaded_at
  ) values (
    v_profile, p_document_type, left(p_storage_path, 700),
    left(p_original_filename, 180), p_mime_type, p_size_bytes,
    left(p_sha256, 128), now()
  )
  on conflict (profile_id, document_type) do update set
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
$$;

revoke all on function public.loadlink_replace_my_driver_document(text,text,text,text,bigint,text) from public;
grant execute on function public.loadlink_replace_my_driver_document(text,text,text,text,bigint,text) to authenticated;

create or replace function public.loadlink_submit_my_driver_profile()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.driver_profiles;
  v_has_identity boolean;
  v_has_licence boolean;
  v_has_prdp boolean;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select * into v_profile from public.driver_profiles where user_id = v_user;
  if not found then raise exception 'DRIVER_PROFILE_INCOMPLETE'; end if;

  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='identity') into v_has_identity;
  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='drivers_licence') into v_has_licence;
  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='prdp') into v_has_prdp;

  if trim(v_profile.full_name) = ''
     or trim(v_profile.city) = ''
     or trim(v_profile.province) = ''
     or trim(v_profile.phone) = ''
     or trim(v_profile.email) = ''
     or trim(v_profile.licence_code) = ''
     or cardinality(v_profile.vehicle_types) = 0
     or not v_has_identity
     or not v_has_licence
     or (v_profile.prdp_required and not v_has_prdp) then
    raise exception 'DRIVER_PROFILE_INCOMPLETE';
  end if;

  update public.driver_profiles set
    status='pending', submitted_at=now(), approved_at=null,
    review_reason=null, missing_document_type=null, updated_at=now()
  where id=v_profile.id;

  return jsonb_build_object('ok', true, 'status', 'pending', 'profileId', v_profile.id);
end;
$$;

revoke all on function public.loadlink_submit_my_driver_profile() from public;
grant execute on function public.loadlink_submit_my_driver_profile() to authenticated;

create or replace function public.loadlink_public_driver_profiles(
  p_limit integer default 8,
  p_offset integer default 0,
  p_city text default null,
  p_search text default null
)
returns table (
  id uuid,
  full_name text,
  headline text,
  city text,
  province text,
  years_experience integer,
  licence_code text,
  vehicle_types text[],
  bio text,
  availability text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id, p.full_name, p.headline, p.city, p.province,
    p.years_experience, p.licence_code, p.vehicle_types,
    p.bio, p.availability, count(*) over()::bigint
  from public.driver_profiles p
  where p.status='approved'
    and (nullif(trim(coalesce(p_city,'')), '') is null or p.city ilike '%' || trim(p_city) || '%')
    and (
      nullif(trim(coalesce(p_search,'')), '') is null
      or concat_ws(' ',p.full_name,p.headline,p.city,p.province,p.licence_code,array_to_string(p.vehicle_types,' '),p.bio)
         ilike '%' || trim(p_search) || '%'
    )
  order by p.approved_at desc nulls last, p.updated_at desc
  limit greatest(1, least(coalesce(p_limit,8),50))
  offset greatest(coalesce(p_offset,0),0);
$$;

revoke all on function public.loadlink_public_driver_profiles(integer,integer,text,text) from public;
grant execute on function public.loadlink_public_driver_profiles(integer,integer,text,text) to anon, authenticated;

create or replace function public.loadlink_driver_contact(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.driver_profiles;
  v_status text := 'active';
begin
  if auth.uid() is null then raise exception 'Sign in to contact a driver'; end if;

  if to_regclass('public.user_moderation_profiles') is not null then
    execute 'select coalesce(status,''active'') from public.user_moderation_profiles where user_id=$1'
      into v_status using auth.uid();
    v_status := coalesce(v_status, 'active');
  end if;
  if v_status in ('suspended','blocked') then raise exception 'Account access is restricted'; end if;

  select * into v_profile from public.driver_profiles where id=p_profile_id and status='approved';
  if not found then raise exception 'Driver profile is unavailable'; end if;
  return jsonb_build_object('phone',v_profile.phone,'email',v_profile.email,'fullName',v_profile.full_name);
end;
$$;

revoke all on function public.loadlink_driver_contact(uuid) from public;
grant execute on function public.loadlink_driver_contact(uuid) to authenticated;

create or replace function public.loadlink_review_driver_profile(
  p_profile_id uuid,
  p_decision text,
  p_reason text default null,
  p_missing_document_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_status text;
begin
  if not public.loadlink_phase2_is_admin() then raise exception 'Administrator access required'; end if;
  if p_decision not in ('approved','rejected','pending') then raise exception 'Invalid review decision'; end if;
  v_status := p_decision;

  update public.driver_profiles set
    status=v_status,
    review_reason=nullif(trim(coalesce(p_reason,'')),''),
    missing_document_type=nullif(trim(coalesce(p_missing_document_type,'')),''),
    approved_at=case when v_status='approved' then now() else null end,
    reviewed_at=now(), reviewed_by=auth.uid(), updated_at=now()
  where id=p_profile_id
  returning user_id into v_user_id;
  if v_user_id is null then raise exception 'Driver profile not found'; end if;

  if to_regclass('public.user_notifications') is not null then
    execute 'insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
             values($1,$2,$3,$4,$5,$6,$7,$8)'
    using v_user_id,
      'driver_profile_'||v_status,
      case when v_status='approved' then 'Driver profile approved' when v_status='rejected' then 'Driver profile needs attention' else 'Driver profile under review' end,
      case when v_status='approved' then 'Your driver profile is now visible in Drivers Available for Work.' else coalesce(nullif(trim(p_reason),''),'Review your profile and update the requested information.') end,
      '/driver-profile','driver_profile',p_profile_id,
      jsonb_build_object('status',v_status,'reason',p_reason,'missingDocumentType',p_missing_document_type);
  end if;

  return jsonb_build_object('ok',true,'status',v_status,'profileId',p_profile_id);
end;
$$;

revoke all on function public.loadlink_review_driver_profile(uuid,text,text,text) from public;
grant execute on function public.loadlink_review_driver_profile(uuid,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. MARKETPLACE RESTRICTION CAPABILITIES
-- ---------------------------------------------------------------------------

create or replace function public.loadlink_marketplace_capabilities()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text := 'active';
  v_restricted boolean := false;
begin
  if auth.uid() is not null and to_regclass('public.user_moderation_profiles') is not null then
    execute 'select coalesce(status,''active'') from public.user_moderation_profiles where user_id=$1'
      into v_status using auth.uid();
    v_status := coalesce(v_status,'active');
  end if;
  v_restricted := v_status in ('suspended','blocked');
  return jsonb_build_object(
    'canBrowse', true,
    'canLogin', not v_restricted,
    'canCall', not v_restricted,
    'canPost', not v_restricted,
    'canMessage', not v_restricted,
    'hideActions', v_restricted,
    'status', v_status
  );
end;
$$;

revoke all on function public.loadlink_marketplace_capabilities() from public;
grant execute on function public.loadlink_marketplace_capabilities() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. CHAT USER BLOCKING
-- ---------------------------------------------------------------------------

create table if not exists public.listing_guest_blocks (
  thread_id uuid not null references public.listing_guest_threads(id) on delete cascade,
  blocked_by_role text not null check (blocked_by_role in ('buyer','owner')),
  created_at timestamptz not null default now(),
  primary key (thread_id, blocked_by_role)
);

alter table public.listing_guest_blocks enable row level security;
drop policy if exists "no direct guest block access" on public.listing_guest_blocks;
create policy "no direct guest block access"
on public.listing_guest_blocks for all to public
using (false) with check (false);

create or replace function public.get_listing_guest_block_status(p_thread_id uuid, p_access_key text)
returns table (blocked_by_me boolean, blocked_by_other boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  v_role := public.guest_chat_role(p_thread_id,p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  return query select
    exists(select 1 from public.listing_guest_blocks b where b.thread_id=p_thread_id and b.blocked_by_role=v_role),
    exists(select 1 from public.listing_guest_blocks b where b.thread_id=p_thread_id and b.blocked_by_role<>v_role);
end;
$$;

revoke all on function public.get_listing_guest_block_status(uuid,text) from public;
grant execute on function public.get_listing_guest_block_status(uuid,text) to anon, authenticated;

create or replace function public.block_listing_guest_user(p_thread_id uuid, p_access_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_role text;
begin
  v_role := public.guest_chat_role(p_thread_id,p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  insert into public.listing_guest_blocks(thread_id,blocked_by_role)
  values(p_thread_id,v_role) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.unblock_listing_guest_user(p_thread_id uuid, p_access_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_role text;
begin
  v_role := public.guest_chat_role(p_thread_id,p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  delete from public.listing_guest_blocks where thread_id=p_thread_id and blocked_by_role=v_role;
  return true;
end;
$$;

revoke all on function public.block_listing_guest_user(uuid,text) from public;
revoke all on function public.unblock_listing_guest_user(uuid,text) from public;
grant execute on function public.block_listing_guest_user(uuid,text) to anon, authenticated;
grant execute on function public.unblock_listing_guest_user(uuid,text) to anon, authenticated;

create or replace function public.loadlink_reject_blocked_guest_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists(select 1 from public.listing_guest_blocks b where b.thread_id=new.thread_id) then
    raise exception 'This conversation is blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists loadlink_reject_blocked_guest_message_trigger on public.listing_guest_messages;
create trigger loadlink_reject_blocked_guest_message_trigger
before insert on public.listing_guest_messages
for each row execute function public.loadlink_reject_blocked_guest_message();

-- ---------------------------------------------------------------------------
-- 5. VOICE NOTES (EXTENDS THE EXISTING PRIVATE ATTACHMENT RPC)
-- ---------------------------------------------------------------------------

create or replace function public.send_listing_guest_attachment(
  p_thread_id uuid,
  p_access_key text,
  p_file_name text,
  p_file_type text,
  p_file_base64 text,
  p_caption text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_message_id uuid;
  v_attachment_id uuid;
  v_file_data bytea;
  v_clean_name text;
  v_allowed_types text[] := array[
    'image/jpeg','image/png','image/webp','application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-m4a'
  ];
begin
  v_role := public.guest_chat_role(p_thread_id,p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;

  if exists(select 1 from public.listing_guest_blocks b where b.thread_id=p_thread_id) then
    raise exception 'This conversation is blocked';
  end if;

  if not public.guest_chat_is_pro(p_access_key)
     and public.guest_chat_daily_message_count(p_access_key) >= 50 then
    raise exception 'Daily message limit reached. Free accounts can send 50 messages per day.';
  end if;

  if not (coalesce(p_file_type,'') = any(v_allowed_types)) then
    raise exception 'This file type is not supported';
  end if;

  begin
    v_file_data := decode(coalesce(p_file_base64,''),'base64');
  exception when others then
    raise exception 'The selected file could not be read';
  end;
  if octet_length(v_file_data)<1 or octet_length(v_file_data)>5242880 then
    raise exception 'Files and voice notes must be 5 MB or smaller';
  end if;

  v_clean_name := left(regexp_replace(coalesce(nullif(trim(p_file_name),''),'attachment'),'[\\/]+','-','g'),180);

  insert into public.listing_guest_messages(thread_id,sender_role,body)
  values(
    p_thread_id,
    v_role,
    case
      when nullif(trim(coalesce(p_caption,'')),'') is not null then left(trim(p_caption),4000)
      when p_file_type like 'audio/%' then 'Voice note'
      else 'Shared an attachment'
    end
  ) returning id into v_message_id;

  insert into public.listing_guest_attachments(message_id,file_name,file_type,file_size,file_data)
  values(v_message_id,v_clean_name,p_file_type,octet_length(v_file_data),v_file_data)
  returning id into v_attachment_id;

  update public.listing_guest_threads set
    updated_at=now(),
    buyer_last_seen=case when v_role='buyer' then now() else buyer_last_seen end,
    owner_last_seen=case when v_role='owner' then now() else owner_last_seen end,
    buyer_typing_until=case when v_role='buyer' then null else buyer_typing_until end,
    owner_typing_until=case when v_role='owner' then null else owner_typing_until end
  where id=p_thread_id;

  return v_attachment_id;
end;
$$;

revoke all on function public.send_listing_guest_attachment(uuid,text,text,text,text,text) from public;
grant execute on function public.send_listing_guest_attachment(uuid,text,text,text,text,text) to anon, authenticated;

-- End of Phase 2 migration.
