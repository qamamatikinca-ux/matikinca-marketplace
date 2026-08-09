-- LOADLINK MARKETPLACE V2.5.9
-- UI-only resubmission experience polish. Database behavior remains the cumulative V2.5.4 schema below.
-- Safe to run after V2.5.4; all statements remain idempotent.

-- LOADLINK MARKETPLACE V2.5
-- Targeted patch: My Posts lifecycle clarity, rejected-photo resubmission,
-- driver-profile submission reliability, and active-chat sketch restoration.
-- Additive/idempotent. Does not delete current listings, messages, users, payments,
-- verification data, package rules, or Pro-only analytics controls.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Remember user-deleted posts so My Posts can explain why they are gone.
-- ---------------------------------------------------------------------------
create table if not exists public.loadlink_listing_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('deleted')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists loadlink_listing_history_user_created_idx
  on public.loadlink_listing_history(user_id, created_at desc);

create unique index if not exists loadlink_listing_history_listing_event_unique
  on public.loadlink_listing_history(listing_id, event_type)
  where listing_id is not null;

alter table public.loadlink_listing_history enable row level security;
revoke all on public.loadlink_listing_history from anon, authenticated;
grant select on public.loadlink_listing_history to authenticated;

drop policy if exists "users read own listing history" on public.loadlink_listing_history;
create policy "users read own listing history"
on public.loadlink_listing_history
for select to authenticated
using (user_id = auth.uid());

create or replace function public.loadlink_record_deleted_listing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.user_id is not null then
    insert into public.loadlink_listing_history(listing_id, user_id, title, event_type, note)
    values(
      old.id,
      old.user_id,
      coalesce(nullif(trim(old.title), ''), 'LoadLink post'),
      'deleted',
      case
        when auth.uid() = old.user_id then 'Deleted by you. This post is no longer active or visible on LoadLink.'
        else 'Removed from LoadLink. This post is no longer active or visible.'
      end
    )
    on conflict (listing_id, event_type) where listing_id is not null do nothing;
  end if;
  return old;
end;
$$;

revoke all on function public.loadlink_record_deleted_listing() from public;

drop trigger if exists loadlink_record_deleted_listing_trigger on public.job_listings;
create trigger loadlink_record_deleted_listing_trigger
before delete on public.job_listings
for each row execute function public.loadlink_record_deleted_listing();

-- Recreate the signed-in delete RPC. The delete trigger records the post history.
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
  v_row public.job_listings%rowtype;
  v_deleted integer;
begin
  if auth.uid() is null then return false; end if;

  select * into v_row
  from public.job_listings
  where id = p_listing_id and user_id = auth.uid()
  for update;

  if not found then return false; end if;

  delete from public.job_listings
  where id = p_listing_id and user_id = auth.uid();
  get diagnostics v_deleted = row_count;

  if v_deleted = 1
     and v_row.listing_access_period_id is not null
     and coalesce(v_row.moderation_status, 'pending') <> 'approved' then
    update public.listing_access_periods
    set consumed_at = null,
        consumed_listing_id = null
    where id = v_row.listing_access_period_id
      and user_id = auth.uid()
      and expires_at > now();
  end if;

  return v_deleted = 1;
end;
$$;

revoke all on function public.delete_my_listing(uuid, text) from public;
grant execute on function public.delete_my_listing(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Edit + resubmit now supports replacing rejected listing photos.
-- ---------------------------------------------------------------------------
create or replace function public.resubmit_my_listing(
  p_listing_id uuid,
  p_title text,
  p_city text,
  p_rate text,
  p_contact_number text,
  p_description text,
  p_photos text[] default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.job_listings%rowtype;
  v_existing_description text;
  v_listing_prefix text := '';
  v_updated integer;
  v_photo_count integer := cardinality(coalesce(p_photos, '{}'::text[]));
  v_photo_limit integer := 5;
begin
  if auth.uid() is null then return false; end if;

  if length(trim(coalesce(p_title, ''))) < 2
     or length(trim(coalesce(p_city, ''))) < 2
     or length(trim(coalesce(p_rate, ''))) < 1
     or length(trim(coalesce(p_contact_number, ''))) < 10
     or length(trim(coalesce(p_description, ''))) < 2 then
    raise exception 'Complete all required listing details';
  end if;

  select * into v_row
  from public.job_listings
  where id = p_listing_id and user_id = auth.uid()
  for update;

  if not found then return false; end if;

  v_existing_description := v_row.description;
  v_photo_limit := case when lower(coalesce(v_row.package_type, 'manual')) in ('pro','dealer') then 15 else 5 end;
  if p_photos is not null and v_photo_count > v_photo_limit then
    raise exception 'This package allows a maximum of % photos', v_photo_limit;
  end if;

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
      description = v_listing_prefix || trim(p_description),
      photos = case when p_photos is null then photos else p_photos end,
      moderation_status = 'pending',
      moderation_notes = null,
      moderated_at = null,
      moderated_by = null
  where id = p_listing_id
    and user_id = auth.uid();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.resubmit_my_listing(uuid, text, text, text, text, text, text[]) from public;
grant execute on function public.resubmit_my_listing(uuid, text, text, text, text, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Refresh driver-profile save/submit RPCs used by /driver-profile.
--    Rejected profiles return to draft on edit, then can be submitted again.
-- ---------------------------------------------------------------------------
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

  if coalesce(p_payload->>'years_experience', '') ~ '^\d{1,2}$' then
    v_years := greatest(0, least(60, (p_payload->>'years_experience')::integer));
  end if;

  if coalesce(p_payload->>'prdp_expiry', '') ~ '^\d{4}-\d{2}-\d{2}$' then
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

  return v_row;
exception
  when invalid_text_representation or datetime_field_overflow then
    raise exception 'Check the experience, PrDP and date values and try again';
end;
$$;

revoke all on function public.loadlink_upsert_my_driver_profile(jsonb) from public;
grant execute on function public.loadlink_upsert_my_driver_profile(jsonb) to authenticated;

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
  v_missing text[] := '{}';
begin
  if v_user is null then raise exception 'Sign in required'; end if;

  select * into v_profile
  from public.driver_profiles
  where user_id = v_user
  for update;

  if not found then raise exception 'DRIVER_PROFILE_INCOMPLETE: save your profile first'; end if;

  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='identity') into v_has_identity;
  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='drivers_licence') into v_has_licence;
  select exists(select 1 from public.driver_documents where profile_id=v_profile.id and document_type='prdp') into v_has_prdp;

  if trim(coalesce(v_profile.full_name, '')) = '' then v_missing := array_append(v_missing, 'full name'); end if;
  if trim(coalesce(v_profile.city, '')) = '' then v_missing := array_append(v_missing, 'city'); end if;
  if trim(coalesce(v_profile.province, '')) = '' then v_missing := array_append(v_missing, 'province'); end if;
  if trim(coalesce(v_profile.phone, '')) = '' then v_missing := array_append(v_missing, 'contact number'); end if;
  if trim(coalesce(v_profile.email, '')) = '' then v_missing := array_append(v_missing, 'email'); end if;
  if trim(coalesce(v_profile.licence_code, '')) = '' then v_missing := array_append(v_missing, 'licence code'); end if;
  if cardinality(coalesce(v_profile.vehicle_types, '{}'::text[])) = 0 then v_missing := array_append(v_missing, 'vehicle experience'); end if;
  if not v_has_identity then v_missing := array_append(v_missing, 'ID or passport'); end if;
  if not v_has_licence then v_missing := array_append(v_missing, 'driver''s licence'); end if;
  if v_profile.prdp_required and not v_has_prdp then v_missing := array_append(v_missing, 'PrDP'); end if;

  if cardinality(v_missing) > 0 then
    raise exception 'DRIVER_PROFILE_INCOMPLETE: %', array_to_string(v_missing, ', ');
  end if;

  update public.driver_profiles
  set status = 'pending',
      submitted_at = now(),
      approved_at = null,
      review_reason = null,
      missing_document_type = null,
      updated_at = now()
  where id = v_profile.id;

  return jsonb_build_object('ok', true, 'status', 'pending', 'profileId', v_profile.id);
end;
$$;

revoke all on function public.loadlink_submit_my_driver_profile() from public;
grant execute on function public.loadlink_submit_my_driver_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) V2.5.3: save + submit driver information atomically.
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_save_and_submit_my_driver_profile(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

revoke all on function public.loadlink_save_and_submit_my_driver_profile(jsonb) from public;
grant execute on function public.loadlink_save_and_submit_my_driver_profile(jsonb) to authenticated;


-- ---------------------------------------------------------------------------
-- 5) V2.5.4: safe public state for stale listing links.
--    Deleted posts stay removed from the marketplace, but stale links can
--    explain whether the post was deleted or rejected without exposing review
--    notes, contact details or private owner data.
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_listing_public_state(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_listing public.job_listings%rowtype;
  v_deleted_title text;
  v_state text;
begin
  select *
  into v_listing
  from public.job_listings
  where id = p_listing_id;

  if found then
    v_state := case
      when lower(coalesce(v_listing.moderation_status, 'pending')) = 'rejected' then 'rejected'
      when lower(coalesce(v_listing.moderation_status, 'pending')) <> 'approved' then 'pending'
      when lower(coalesce(v_listing.status, 'active')) in ('closed', 'filled', 'inactive', 'removed') then 'closed'
      when lower(coalesce(v_listing.status, 'active')) = 'active' then 'active'
      else 'unavailable'
    end;

    return jsonb_build_object(
      'state', v_state,
      'title', nullif(trim(v_listing.title), ''),
      'city', nullif(trim(v_listing.city), ''),
      'vehicle_group', nullif(trim(v_listing.vehicle_group), ''),
      'checked_at', now()
    );
  end if;

  if to_regclass('public.loadlink_listing_history') is not null then
    select h.title
    into v_deleted_title
    from public.loadlink_listing_history h
    where h.listing_id = p_listing_id
      and h.event_type = 'deleted'
    order by h.created_at desc
    limit 1;
  end if;

  if v_deleted_title is not null then
    return jsonb_build_object(
      'state', 'deleted',
      'title', v_deleted_title,
      'checked_at', now()
    );
  end if;

  return jsonb_build_object('state', 'unavailable', 'checked_at', now());
end;
$$;

revoke all on function public.loadlink_listing_public_state(uuid) from public;
grant execute on function public.loadlink_listing_public_state(uuid) to anon, authenticated;

-- End LoadLink Marketplace V2.5.4.

-- ---------------------------------------------------------------------------
-- V2.5.9: rejected-post correction can also change the vehicle category.
-- Kept as a new RPC name to avoid breaking older installed clients.
-- ---------------------------------------------------------------------------
create or replace function public.resubmit_my_listing_v2(
  p_listing_id uuid,
  p_title text,
  p_city text,
  p_vehicle_group text,
  p_rate text,
  p_contact_number text,
  p_description text,
  p_photos text[] default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.job_listings%rowtype;
  v_existing_description text;
  v_listing_prefix text := '';
  v_updated integer;
  v_photo_count integer := cardinality(coalesce(p_photos, '{}'::text[]));
  v_photo_limit integer := 5;
  v_group text := trim(coalesce(p_vehicle_group, ''));
begin
  if auth.uid() is null then return false; end if;

  if v_group not in ('Catering / Event', 'Trucks / Trailers', 'Farming / Mining') then
    raise exception 'Choose a valid LoadLink vehicle category';
  end if;

  if length(trim(coalesce(p_title, ''))) < 2
     or length(trim(coalesce(p_city, ''))) < 2
     or length(trim(coalesce(p_rate, ''))) < 1
     or length(trim(coalesce(p_contact_number, ''))) < 10
     or length(trim(coalesce(p_description, ''))) < 2 then
    raise exception 'Complete all required listing details';
  end if;

  select * into v_row
  from public.job_listings
  where id = p_listing_id and user_id = auth.uid()
  for update;

  if not found then return false; end if;

  v_existing_description := v_row.description;
  v_photo_limit := case when lower(coalesce(v_row.package_type, 'manual')) in ('pro','dealer') then 15 else 5 end;

  if p_photos is not null and v_photo_count > v_photo_limit then
    raise exception 'This package allows a maximum of % photos', v_photo_limit;
  end if;

  if v_existing_description ~* '^Listing type:' then
    v_listing_prefix := split_part(v_existing_description, E'\n', 1) || E'\n';
    if split_part(v_existing_description, E'\n', 2) ~* '^Vehicle needed:' then
      v_listing_prefix := v_listing_prefix || split_part(v_existing_description, E'\n', 2) || E'\n';
    end if;
  end if;

  update public.job_listings
  set title = trim(p_title),
      city = trim(p_city),
      vehicle_group = v_group,
      rate = trim(p_rate),
      contact_number = trim(p_contact_number),
      description = v_listing_prefix || trim(p_description),
      photos = case when p_photos is null then photos else p_photos end,
      moderation_status = 'pending',
      moderation_notes = null,
      moderated_at = null,
      moderated_by = null
  where id = p_listing_id
    and user_id = auth.uid();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.resubmit_my_listing_v2(uuid, text, text, text, text, text, text, text[]) from public;
grant execute on function public.resubmit_my_listing_v2(uuid, text, text, text, text, text, text, text[]) to authenticated;


-- ---------------------------------------------------------------------------
-- LOADLINK V2.6.4 — ACCOUNT DEVICE / ACCESS ACTIVITY
-- Private per-user device records used by Account → Activity & access.
-- ---------------------------------------------------------------------------
create table if not exists public.loadlink_account_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  label text not null default 'LoadLink device',
  browser text,
  platform text,
  user_agent text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique(user_id, device_id)
);

create index if not exists loadlink_account_devices_user_seen_idx
  on public.loadlink_account_devices(user_id, last_seen desc);

alter table public.loadlink_account_devices enable row level security;

revoke all on public.loadlink_account_devices from anon, authenticated;
grant select, insert, update, delete on public.loadlink_account_devices to authenticated;

drop policy if exists "users read own LoadLink devices" on public.loadlink_account_devices;
create policy "users read own LoadLink devices"
on public.loadlink_account_devices
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "users add own LoadLink devices" on public.loadlink_account_devices;
create policy "users add own LoadLink devices"
on public.loadlink_account_devices
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "users update own LoadLink devices" on public.loadlink_account_devices;
create policy "users update own LoadLink devices"
on public.loadlink_account_devices
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users delete own LoadLink devices" on public.loadlink_account_devices;
create policy "users delete own LoadLink devices"
on public.loadlink_account_devices
for delete to authenticated
using (user_id = auth.uid());

-- The existing user_activity_events table remains the source for login and
-- account event history. No advertiser/admin-readable public policy is added.

-- Ensure the private account-activity sources used by the new Activity page
-- exist even on LoadLink databases that skipped an older account-storage patch.
create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  entity_type text not null default 'website',
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_activity_events_user_created_idx
  on public.user_activity_events(user_id, created_at desc);
alter table public.user_activity_events enable row level security;
grant select, insert on public.user_activity_events to authenticated;
drop policy if exists "users read own activity" on public.user_activity_events;
create policy "users read own activity" on public.user_activity_events
for select to authenticated using (user_id = auth.uid());
drop policy if exists "users insert own activity" on public.user_activity_events;
create policy "users insert own activity" on public.user_activity_events
for insert to authenticated with check (user_id = auth.uid());

create table if not exists public.billing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid,
  item_type text not null,
  item_code text,
  amount_cents bigint not null,
  currency text not null default 'ZAR',
  status text not null,
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists billing_history_user_created_idx
  on public.billing_history(user_id, created_at desc);
alter table public.billing_history enable row level security;
grant select on public.billing_history to authenticated;
drop policy if exists "billing own read" on public.billing_history;
create policy "billing own read" on public.billing_history
for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- V2.6.4 posting-experience feedback foundation.
-- Ensures the five-star prompt shown after a successful post can save feedback.
-- ---------------------------------------------------------------------------
create table if not exists public.posting_experience_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.job_listings(id) on delete set null,
  listing_title text,
  surface text not null check (surface in ('job','contract','asset','vehicle')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists posting_experience_feedback_listing_user_unique
  on public.posting_experience_feedback(user_id, listing_id, surface)
  where listing_id is not null;

create index if not exists posting_experience_feedback_created_idx
  on public.posting_experience_feedback(created_at desc);

alter table public.posting_experience_feedback enable row level security;
revoke all on public.posting_experience_feedback from anon, authenticated;

create or replace function public.submit_posting_experience_feedback(
  p_listing_id uuid,
  p_listing_title text,
  p_surface text,
  p_rating integer,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if p_surface not in ('job','contract','asset','vehicle') then raise exception 'INVALID_FEEDBACK_SURFACE'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'RATING_MUST_BE_1_TO_5'; end if;
  if length(coalesce(p_comment, '')) > 500 then raise exception 'COMMENT_TOO_LONG'; end if;

  if p_listing_id is not null and not exists(
    select 1 from public.job_listings where id = p_listing_id and user_id = auth.uid()
  ) then
    raise exception 'LISTING_OWNERSHIP_REQUIRED';
  end if;

  if p_listing_id is not null then
    insert into public.posting_experience_feedback(user_id, listing_id, listing_title, surface, rating, comment)
    values(auth.uid(), p_listing_id, nullif(trim(coalesce(p_listing_title,'')),''), p_surface, p_rating, nullif(trim(coalesce(p_comment,'')),''))
    on conflict (user_id, listing_id, surface) where listing_id is not null
    do update set rating = excluded.rating, comment = excluded.comment, listing_title = excluded.listing_title, updated_at = now()
    returning id into v_id;
  else
    insert into public.posting_experience_feedback(user_id, listing_id, listing_title, surface, rating, comment)
    values(auth.uid(), null, nullif(trim(coalesce(p_listing_title,'')),''), p_surface, p_rating, nullif(trim(coalesce(p_comment,'')),''))
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.submit_posting_experience_feedback(uuid, text, text, integer, text) from public;
grant execute on function public.submit_posting_experience_feedback(uuid, text, text, integer, text) to authenticated;

