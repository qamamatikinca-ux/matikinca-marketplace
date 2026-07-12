-- LoadLink shared jobs database setup
-- Run this once in Supabase SQL Editor.
-- This enables listings to show for everyone, not only on one phone/browser.
-- Test-mode policies are public so posting works before full login/payment rules are added.

create extension if not exists pgcrypto;

create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null,
  vehicle_group text not null,
  rate text not null,
  posted_by text not null,
  contact_number text not null default '',
  description text not null,
  photos text[] not null default '{}',
  sponsored boolean not null default false,
  package_type text not null default 'standard',
  created_at timestamptz not null default now()
);

alter table public.job_listings
add column if not exists contact_number text not null default '';

alter table public.job_listings
add column if not exists created_at timestamptz not null default now();

alter table public.job_listings
add column if not exists photos text[] not null default '{}';

alter table public.job_listings
add column if not exists sponsored boolean not null default false;

alter table public.job_listings
add column if not exists package_type text not null default 'standard';

alter table public.job_listings enable row level security;

drop policy if exists "loadlink_jobs_read_all" on public.job_listings;
create policy "loadlink_jobs_read_all"
on public.job_listings
for select
using (true);

drop policy if exists "loadlink_jobs_insert_all_testing" on public.job_listings;
create policy "loadlink_jobs_insert_all_testing"
on public.job_listings
for insert
with check (
  length(title) > 1
  and length(city) > 1
  and length(vehicle_group) > 1
  and length(rate) > 1
  and length(posted_by) > 1
  and length(contact_number) >= 10
  and length(description) > 1
  and array_length(photos, 1) between 1 and 15
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-photos',
  'job-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "loadlink_job_photos_read_all" on storage.objects;
create policy "loadlink_job_photos_read_all"
on storage.objects
for select
using (bucket_id = 'job-photos');

drop policy if exists "loadlink_job_photos_insert_all_testing" on storage.objects;
create policy "loadlink_job_photos_insert_all_testing"
on storage.objects
for insert
with check (bucket_id = 'job-photos');

do $$
begin
  alter publication supabase_realtime add table public.job_listings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
