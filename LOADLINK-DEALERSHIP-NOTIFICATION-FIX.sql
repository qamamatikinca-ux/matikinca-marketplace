-- LOADLINK DEALERSHIP + NOTIFICATION FIX
-- Safe additive update. Existing users, listings, messages and documents are preserved.

create extension if not exists pgcrypto;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;

revoke all on public.user_notifications from anon, authenticated;

drop policy if exists "users read own notifications" on public.user_notifications;
create policy "users read own notifications"
on public.user_notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.user_notifications;
create policy "users update own notifications"
on public.user_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select on public.user_notifications to authenticated;
grant update (is_read, read_at) on public.user_notifications to authenticated;

-- The updated private admin site creates decision notifications directly.
-- Remove older trigger versions to prevent duplicate notifications if they exist.
drop trigger if exists loadlink_listing_moderation_insert_notification on public.job_listings;
drop trigger if exists loadlink_listing_moderation_update_notification on public.job_listings;

do $$
begin
  if to_regclass('public.vehicle_verifications') is not null then
    execute 'drop trigger if exists loadlink_verification_insert_notification on public.vehicle_verifications';
    execute 'drop trigger if exists loadlink_verification_update_notification on public.vehicle_verifications';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.user_moderation_profiles') is not null then
    execute 'drop trigger if exists loadlink_user_moderation_insert_notification on public.user_moderation_profiles';
    execute 'drop trigger if exists loadlink_user_moderation_update_notification on public.user_moderation_profiles';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.admin_payments') is not null then
    execute 'drop trigger if exists loadlink_payment_insert_notification on public.admin_payments';
    execute 'drop trigger if exists loadlink_payment_update_notification on public.admin_payments';
  end if;
end;
$$;

-- Dealership application fields.
alter table public.vehicle_verifications
  add column if not exists dealership_application boolean not null default false;

alter table public.vehicle_verifications
  add column if not exists dealership_name text;

alter table public.vehicle_verifications
  add column if not exists company_registration_number text;

alter table public.vehicle_verifications
  add column if not exists tax_number text;

alter table public.vehicle_verifications
  add column if not exists company_registration_document_path text;

alter table public.vehicle_verifications
  add column if not exists tax_document_path text;

alter table public.vehicle_verifications
  add column if not exists business_address_document_path text;

alter table public.vehicle_verifications
  add column if not exists representative_authority_document_path text;

create index if not exists vehicle_verifications_dealership_status_idx
  on public.vehicle_verifications(dealership_application, status, created_at desc);

-- Keep realtime delivery enabled when available.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
exception
  when insufficient_privilege then
    null;
end;
$$;
