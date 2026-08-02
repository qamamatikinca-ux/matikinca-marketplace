-- LOADLINK: MY POSTS + TRUCK CATALOGUE/VERIFICATION
-- Safe additive migration. It does not delete or recreate existing posts,
-- messages, profiles, account state or storage files.

create extension if not exists pgcrypto;

grant usage on schema public to authenticated;

-- ---------------------------------------------------------------------------
-- 1) Listing management status
-- ---------------------------------------------------------------------------
alter table if exists public.job_listings
  add column if not exists status text not null default 'active';

alter table if exists public.job_listings
  drop constraint if exists job_listings_status_check;

alter table if exists public.job_listings
  add constraint job_listings_status_check
  check (status in ('active', 'filled', 'closed', 'draft'));

create index if not exists job_listings_user_status_created_idx
  on public.job_listings(user_id, status, created_at desc);

-- Owner helper used by all management RPCs. A signed-in account owns a row when
-- its user_id matches auth.uid(). The long owner key remains a safe fallback for
-- listings created before account ownership was attached.
create or replace function public.loadlink_owns_listing(
  p_listing_id uuid,
  p_owner_key text default ''
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.job_listings j
    where j.id = p_listing_id
      and auth.uid() is not null
      and (
        j.user_id = auth.uid()
        or (
          length(coalesce(p_owner_key, '')) >= 20
          and j.owner_key = p_owner_key
        )
      )
  );
$$;

revoke all on function public.loadlink_owns_listing(uuid, text) from public;
grant execute on function public.loadlink_owns_listing(uuid, text) to authenticated;

create or replace function public.delete_my_listing(
  p_listing_id uuid,
  p_owner_key text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if not public.loadlink_owns_listing(p_listing_id, p_owner_key) then
    return false;
  end if;

  delete from public.job_listings where id = p_listing_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create or replace function public.set_my_listing_status(
  p_listing_id uuid,
  p_status text,
  p_owner_key text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if p_status not in ('active', 'filled', 'closed', 'draft') then
    raise exception 'Invalid listing status';
  end if;

  if not public.loadlink_owns_listing(p_listing_id, p_owner_key) then
    return false;
  end if;

  update public.job_listings
  set status = p_status
  where id = p_listing_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.update_my_listing(
  p_listing_id uuid,
  p_title text,
  p_city text,
  p_rate text,
  p_contact_number text,
  p_description text,
  p_owner_key text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_description text;
  v_listing_prefix text := '';
  v_updated integer;
begin
  if not public.loadlink_owns_listing(p_listing_id, p_owner_key) then
    return false;
  end if;

  if length(trim(coalesce(p_title, ''))) < 2
     or length(trim(coalesce(p_city, ''))) < 2
     or length(trim(coalesce(p_rate, ''))) < 1
     or length(trim(coalesce(p_contact_number, ''))) < 10
     or length(trim(coalesce(p_description, ''))) < 2 then
    raise exception 'Complete all required listing details';
  end if;

  select description into v_existing_description
  from public.job_listings
  where id = p_listing_id;

  -- Preserve the internal listing type and vehicle selector lines while the
  -- owner edits the human-readable content.
  if v_existing_description ~* '^Listing type:' then
    v_listing_prefix := split_part(v_existing_description, E'\n', 1) || E'\n';
    if split_part(v_existing_description, E'\n', 2) ~* '^Vehicle needed:' then
      v_listing_prefix := v_listing_prefix || split_part(v_existing_description, E'\n', 2) || E'\n';
    end if;
  end if;

  update public.job_listings
  set title = trim(p_title),
      city = trim(p_city),
      rate = trim(p_rate),
      contact_number = trim(p_contact_number),
      description = v_listing_prefix || trim(p_description)
  where id = p_listing_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.delete_my_listing(uuid, text) from public;
revoke all on function public.set_my_listing_status(uuid, text, text) from public;
revoke all on function public.update_my_listing(uuid, text, text, text, text, text, text) from public;
grant execute on function public.delete_my_listing(uuid, text) to authenticated;
grant execute on function public.set_my_listing_status(uuid, text, text) to authenticated;
grant execute on function public.update_my_listing(uuid, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Private structured truck details
-- ---------------------------------------------------------------------------
create table if not exists public.truck_listing_details (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.job_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_year integer not null check (vehicle_year between 2010 and 2027),
  brand text not null,
  model text not null,
  body_type text not null,
  transmission text not null,
  fuel_type text not null,
  axle_configuration text not null,
  registration_number text not null,
  vin text not null,
  engine_number text not null,
  odometer_km bigint not null check (odometer_km >= 0),
  gvm_kg integer check (gvm_kg is null or gvm_kg >= 0),
  payload_kg integer check (payload_kg is null or payload_kg >= 0),
  reference_image_url text,
  reference_image_source text,
  factory_transmissions text[] not null default '{}',
  specification_status text not null default 'catalogue_match'
    check (specification_status in ('catalogue_match', 'modified_pending_review', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists truck_listing_details_user_created_idx
  on public.truck_listing_details(user_id, created_at desc);

alter table public.truck_listing_details enable row level security;

drop policy if exists "truck owners insert own details" on public.truck_listing_details;
create policy "truck owners insert own details"
on public.truck_listing_details
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.job_listings j
    where j.id = listing_id and j.user_id = auth.uid()
  )
);

drop policy if exists "truck owners read own details" on public.truck_listing_details;
create policy "truck owners read own details"
on public.truck_listing_details
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "truck owners update own details" on public.truck_listing_details;
create policy "truck owners update own details"
on public.truck_listing_details
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on public.truck_listing_details to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Private verification records and documents
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_verifications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.job_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  id_document_path text not null,
  licence_document_path text not null,
  registration_document_path text not null,
  ownership_document_path text not null,
  roadworthy_document_path text,
  operating_licence_document_path text,
  modification_document_path text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'more_information_required', 'verified', 'rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_verifications_user_status_idx
  on public.vehicle_verifications(user_id, status, created_at desc);

alter table public.vehicle_verifications enable row level security;

drop policy if exists "vehicle owners submit verification" on public.vehicle_verifications;
create policy "vehicle owners submit verification"
on public.vehicle_verifications
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.job_listings j
    where j.id = listing_id and j.user_id = auth.uid()
  )
);

drop policy if exists "vehicle owners read verification" on public.vehicle_verifications;
create policy "vehicle owners read verification"
on public.vehicle_verifications
for select
to authenticated
using (user_id = auth.uid());

grant select, insert on public.vehicle_verifications to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vehicle-verification',
  'vehicle-verification',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

drop policy if exists "vehicle owners upload own verification files" on storage.objects;
create policy "vehicle owners upload own verification files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vehicle-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "vehicle owners read own verification files" on storage.objects;
create policy "vehicle owners read own verification files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vehicle-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "vehicle owners replace own verification files" on storage.objects;
create policy "vehicle owners replace own verification files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vehicle-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'vehicle-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Analytics remains Pro-only. The existing get_pro_job_analytics RPC already
-- rejects Standard listings. No Standard analytics permission is added here.
