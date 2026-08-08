-- LOADLINK MARKETPLACE V2.3
-- Posting ownership hardening + Customer Experience posting feedback.
-- Additive migration. Does not delete listings, users, messages, payments or verification data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Strict signed-in ownership for post management
-- ---------------------------------------------------------------------------
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
      and j.user_id = auth.uid()
  );
$$;

revoke all on function public.loadlink_owns_listing(uuid, text) from public;
grant execute on function public.loadlink_owns_listing(uuid, text) to authenticated;

create or replace function public.delete_job_listing(
  p_job_id uuid,
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
  where id = p_job_id and user_id = auth.uid()
  for update;

  if not found then return false; end if;

  delete from public.job_listings
  where id = p_job_id and user_id = auth.uid();
  get diagnostics v_deleted = row_count;

  if v_deleted = 1
     and v_row.listing_access_period_id is not null
     and coalesce(v_row.moderation_status, 'pending') <> 'approved' then
    update public.listing_access_periods
    set consumed_at = null, consumed_listing_id = null
    where id = v_row.listing_access_period_id
      and user_id = auth.uid()
      and expires_at > now();
  end if;

  return v_deleted = 1;
end;
$$;

create or replace function public.update_job_listing(
  p_job_id uuid,
  p_owner_key text,
  p_title text,
  p_city text,
  p_vehicle_group text,
  p_rate text,
  p_contact_number text,
  p_description text
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
  if auth.uid() is null then return false; end if;

  select description into v_existing_description
  from public.job_listings
  where id = p_job_id and user_id = auth.uid();

  if not found then return false; end if;

  if v_existing_description ~* '^Listing type:' then
    v_listing_prefix := split_part(v_existing_description, E'\n', 1) || E'\n';
    if split_part(v_existing_description, E'\n', 2) ~* '^Vehicle needed:' then
      v_listing_prefix := v_listing_prefix || split_part(v_existing_description, E'\n', 2) || E'\n';
    end if;
  end if;

  update public.job_listings
  set title = trim(p_title),
      city = trim(p_city),
      vehicle_group = trim(p_vehicle_group),
      rate = trim(p_rate),
      contact_number = trim(p_contact_number),
      description = v_listing_prefix || trim(p_description),
      moderation_status = 'pending',
      moderation_notes = null,
      moderated_at = null,
      moderated_by = null
  where id = p_job_id
    and user_id = auth.uid();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.delete_job_listing(uuid, text) from public;
revoke all on function public.update_job_listing(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.delete_job_listing(uuid, text) to authenticated;
grant execute on function public.update_job_listing(uuid, text, text, text, text, text, text, text) to authenticated;

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
    set consumed_at = null, consumed_listing_id = null
    where id = v_row.listing_access_period_id
      and user_id = auth.uid()
      and expires_at > now();
  end if;

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
  if auth.uid() is null then return false; end if;

  update public.job_listings
  set status = p_status
  where id = p_listing_id
    and user_id = auth.uid();

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
  if auth.uid() is null then return false; end if;
  if length(trim(coalesce(p_title, ''))) < 2
     or length(trim(coalesce(p_city, ''))) < 2
     or length(trim(coalesce(p_rate, ''))) < 1
     or length(trim(coalesce(p_contact_number, ''))) < 10
     or length(trim(coalesce(p_description, ''))) < 2 then
    raise exception 'Complete all required listing details';
  end if;

  select description into v_existing_description
  from public.job_listings
  where id = p_listing_id and user_id = auth.uid();

  if not found then return false; end if;

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

revoke all on function public.delete_my_listing(uuid, text) from public;
revoke all on function public.set_my_listing_status(uuid, text, text) from public;
revoke all on function public.update_my_listing(uuid, text, text, text, text, text, text) from public;
grant execute on function public.delete_my_listing(uuid, text) to authenticated;
grant execute on function public.set_my_listing_status(uuid, text, text) to authenticated;
grant execute on function public.update_my_listing(uuid, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Customer Experience: posting submission feedback
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

create index if not exists posting_experience_feedback_rating_idx
  on public.posting_experience_feedback(rating, created_at desc);

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

-- Existing LoadLink admin identity contract, created safely if an earlier migration did not create it.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'viewer',
  department text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_loadlink_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.admin_users
    where user_id = auth.uid() and is_active = true
  );
$$;

revoke all on function public.is_loadlink_admin() from public;
grant execute on function public.is_loadlink_admin() to authenticated;

create or replace function public.get_posting_experience_feedback(p_limit integer default 200)
returns table (
  id uuid,
  rating integer,
  comment text,
  surface text,
  listing_id uuid,
  listing_title text,
  user_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_loadlink_admin() then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;

  return query
  select
    f.id,
    f.rating::integer,
    f.comment,
    f.surface,
    f.listing_id,
    f.listing_title,
    u.email::text,
    f.created_at
  from public.posting_experience_feedback f
  left join auth.users u on u.id = f.user_id
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

revoke all on function public.get_posting_experience_feedback(integer) from public;
grant execute on function public.get_posting_experience_feedback(integer) to authenticated;

-- Keep the existing owner account available in the Control Centre when present.
insert into public.admin_users(user_id,email,display_name,role,department,is_active)
select id,lower(email),coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','LoadLink Owner'),'owner','Executive',true
from auth.users
where lower(email)=lower('loadlinksouthafrica@gmail.com')
on conflict(user_id) do update
set email=excluded.email, role='owner', department='Executive', is_active=true, updated_at=now();
