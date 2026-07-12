-- LOADLINK VERIFICATION + VERIFIED LISTING MIGRATION
-- Safe to run more than once in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Existing projects may already have a profiles table. Create it when missing,
-- then add only the columns that are not already present.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists verification_status text default 'not_started';
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles set role = 'user' where role is null;
update public.profiles set verification_status = 'not_started' where verification_status is null;

alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column verification_status set default 'not_started';

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  id_type text not null check (id_type in ('south_african_id','passport')),
  id_number_last4 text not null,
  id_document_path text not null,
  selfie_path text not null,
  company_document_path text,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.profiles enable row level security;
alter table public.verification_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Prevent ordinary users from awarding themselves admin or verified status,
-- even if an older profile update policy already exists in this project.
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.verification_status := old.verification_status;
    new.verified_at := old.verified_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields_trigger on public.profiles;
create trigger protect_profile_security_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- Re-runnable profile policies.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles for insert
with check (
  id = auth.uid()
  and coalesce(role, 'user') = 'user'
  and coalesce(verification_status, 'not_started') in ('not_started','phone_verified')
);

-- Re-runnable verification request policies.
drop policy if exists "users read own verification" on public.verification_requests;
create policy "users read own verification"
on public.verification_requests for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users create own verification" on public.verification_requests;
create policy "users create own verification"
on public.verification_requests for insert
with check (
  user_id = auth.uid()
  and status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
);

drop policy if exists "users replace own pending verification" on public.verification_requests;
create policy "users replace own pending verification"
on public.verification_requests for update
using (user_id = auth.uid() and status in ('pending','rejected'))
with check (
  user_id = auth.uid()
  and status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
);

drop policy if exists "admins update verification" on public.verification_requests;
create policy "admins update verification"
on public.verification_requests for update
using (public.is_admin())
with check (public.is_admin());

-- Private verification document bucket.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own verification documents" on storage.objects;
create policy "users upload own verification documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users read own verification documents" on storage.objects;
create policy "users read own verification documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'verification-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "users replace own verification documents" on storage.objects;
create policy "users replace own verification documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.review_verification(
  request_id uuid,
  decision text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  if decision not in ('verified','rejected') then
    raise exception 'Invalid decision';
  end if;

  select user_id into target_user
  from public.verification_requests
  where id = request_id;

  if target_user is null then
    raise exception 'Verification request not found';
  end if;

  update public.verification_requests
  set
    status = decision,
    rejection_reason = case when decision = 'rejected' then reason else null end,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = request_id;

  insert into public.profiles (id, role, verification_status, verified_at, updated_at)
  values (
    target_user,
    'user',
    decision,
    case when decision = 'verified' then now() else null end,
    now()
  )
  on conflict (id) do update set
    verification_status = excluded.verification_status,
    verified_at = excluded.verified_at,
    updated_at = now();
end;
$$;

revoke all on function public.review_verification(uuid,text,text) from public;
grant execute on function public.review_verification(uuid,text,text) to authenticated;

-- Add verification request changes to Realtime only when not already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'verification_requests'
  ) then
    alter publication supabase_realtime add table public.verification_requests;
  end if;
end;
$$;

-- Link a listing to the signed-in user. The frontend only shows the gold
-- Verified badge when this user has verification_status = 'verified'.
do $$
begin
  if to_regclass('public.job_listings') is not null then
    alter table public.job_listings
      add column if not exists user_id uuid references auth.users(id) on delete set null;
    create index if not exists job_listings_user_id_idx
      on public.job_listings(user_id);
  end if;
end;
$$;
