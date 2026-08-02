-- LOADLINK CONTROL BRIDGE
-- Connects the private Control Centre to the public LoadLink website.
-- Admin decisions remain server-side. Users only see decisions that belong to them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Private user notifications
-- ---------------------------------------------------------------------------
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

-- Enable instant delivery when Supabase Realtime is available.
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

-- ---------------------------------------------------------------------------
-- 2) Listing decisions create user notifications
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_notify_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text := coalesce(new.moderation_status, 'pending');
  v_title text;
  v_message text;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.moderation_status is not distinct from new.moderation_status
       and old.moderation_notes is not distinct from new.moderation_notes then
      return new;
    end if;
  end if;

  if v_status = 'approved' then
    v_title := 'Your post was approved';
    v_message := '“' || coalesce(new.title, 'Your listing') || '” is now live on LoadLink.';
  elsif v_status = 'rejected' then
    v_title := 'Your post was rejected';
    v_message := '“' || coalesce(new.title, 'Your listing') || '” was rejected. Reason: ' ||
      coalesce(nullif(btrim(new.moderation_notes), ''), 'The listing did not meet LoadLink requirements.');
  else
    v_title := case when tg_op = 'INSERT' then 'Your post was submitted' else 'Your post is under review' end;
    v_message := '“' || coalesce(new.title, 'Your listing') || '” is waiting for LoadLink review.';
  end if;

  insert into public.user_notifications (
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    metadata
  ) values (
    new.user_id,
    'listing_' || v_status,
    v_title,
    v_message,
    'job_listing',
    new.id,
    '/my-posts',
    jsonb_build_object(
      'listing_title', new.title,
      'status', v_status,
      'reason', new.moderation_notes
    )
  );

  return new;
end;
$$;

revoke all on function public.loadlink_notify_listing_moderation() from public;

drop trigger if exists loadlink_listing_moderation_insert_notification on public.job_listings;
create trigger loadlink_listing_moderation_insert_notification
after insert on public.job_listings
for each row
execute function public.loadlink_notify_listing_moderation();

drop trigger if exists loadlink_listing_moderation_update_notification on public.job_listings;
create trigger loadlink_listing_moderation_update_notification
after update of moderation_status, moderation_notes on public.job_listings
for each row
execute function public.loadlink_notify_listing_moderation();

-- ---------------------------------------------------------------------------
-- 3) Editing a rejected post resubmits it for review
-- ---------------------------------------------------------------------------
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

  select description
  into v_existing_description
  from public.job_listings
  where id = p_listing_id;

  if v_existing_description ~* '^Listing type:' then
    v_listing_prefix := split_part(v_existing_description, E'\n', 1) || E'\n';

    if split_part(v_existing_description, E'\n', 2) ~* '^Vehicle needed:' then
      v_listing_prefix := v_listing_prefix || split_part(v_existing_description, E'\n', 2) || E'\n';
    end if;
  end if;

  update public.job_listings
  set
    title = trim(p_title),
    city = trim(p_city),
    rate = trim(p_rate),
    contact_number = trim(p_contact_number),
    description = v_listing_prefix || trim(p_description),
    moderation_status = 'pending',
    moderation_notes = null,
    moderated_at = null,
    moderated_by = null
  where id = p_listing_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.update_my_listing(
  uuid, text, text, text, text, text, text
) from public;

grant execute on function public.update_my_listing(
  uuid, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Verification decisions create user notifications
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_notify_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_message text;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status
       and old.reviewer_notes is not distinct from new.reviewer_notes then
      return new;
    end if;
  end if;

  if new.status = 'verified' then
    v_title := 'Verification approved';
    v_message := 'Your truck verification was approved.';
  elsif new.status = 'rejected' then
    v_title := 'Verification rejected';
    v_message := 'Your truck verification was rejected. Reason: ' ||
      coalesce(nullif(btrim(new.reviewer_notes), ''), 'The application did not meet verification requirements.');
  elsif new.status = 'more_information_required' then
    v_title := 'More information required';
    v_message := 'LoadLink needs more information for your verification. ' ||
      coalesce(nullif(btrim(new.reviewer_notes), ''), 'Open your verification status for details.');
  elsif new.status = 'under_review' then
    v_title := 'Verification under review';
    v_message := 'Your verification application is being reviewed.';
  else
    v_title := 'Verification received';
    v_message := 'Your verification application was received.';
  end if;

  insert into public.user_notifications (
    user_id, type, title, message, entity_type, entity_id, action_url, metadata
  ) values (
    new.user_id,
    'verification_' || new.status,
    v_title,
    v_message,
    'vehicle_verification',
    new.id,
    '/verification-status',
    jsonb_build_object(
      'status', new.status,
      'reason', new.reviewer_notes,
      'listing_id', new.listing_id
    )
  );

  return new;
end;
$$;

revoke all on function public.loadlink_notify_verification_change() from public;

drop trigger if exists loadlink_verification_insert_notification on public.vehicle_verifications;
create trigger loadlink_verification_insert_notification
after insert on public.vehicle_verifications
for each row
execute function public.loadlink_notify_verification_change();

drop trigger if exists loadlink_verification_update_notification on public.vehicle_verifications;
create trigger loadlink_verification_update_notification
after update of status, reviewer_notes on public.vehicle_verifications
for each row
execute function public.loadlink_notify_verification_change();

-- ---------------------------------------------------------------------------
-- 5) User restrictions create private account notifications
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_notify_user_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_message text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status
       and old.reason is not distinct from new.reason
       and old.suspended_until is not distinct from new.suspended_until then
      return new;
    end if;
  end if;

  if new.status = 'active' then
    v_title := 'Account access restored';
    v_message := coalesce(nullif(btrim(new.reason), ''), 'Your LoadLink account is active again.');
  elsif new.status = 'flagged' then
    v_title := 'Account warning';
    v_message := 'Your account was flagged. Reason: ' ||
      coalesce(nullif(btrim(new.reason), ''), 'Your activity requires review.');
  elsif new.status = 'suspended' then
    v_title := 'Account suspended';
    v_message := 'Your account was suspended. Reason: ' ||
      coalesce(nullif(btrim(new.reason), ''), 'A LoadLink policy was not followed.') ||
      case when new.suspended_until is not null then ' Suspension ends ' || to_char(new.suspended_until at time zone 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI') || '.' else '' end;
  else
    v_title := 'Account blocked';
    v_message := 'Your account was blocked. Reason: ' ||
      coalesce(nullif(btrim(new.reason), ''), 'A serious or repeated LoadLink policy violation occurred.');
  end if;

  insert into public.user_notifications (
    user_id, type, title, message, entity_type, entity_id, action_url, metadata
  ) values (
    new.user_id,
    'account_' || new.status,
    v_title,
    v_message,
    'user_account',
    new.user_id,
    '/login',
    jsonb_build_object(
      'status', new.status,
      'reason', new.reason,
      'suspended_until', new.suspended_until
    )
  );

  return new;
end;
$$;

revoke all on function public.loadlink_notify_user_moderation() from public;

drop trigger if exists loadlink_user_moderation_insert_notification on public.user_moderation_profiles;
create trigger loadlink_user_moderation_insert_notification
after insert on public.user_moderation_profiles
for each row
execute function public.loadlink_notify_user_moderation();

drop trigger if exists loadlink_user_moderation_update_notification on public.user_moderation_profiles;
create trigger loadlink_user_moderation_update_notification
after update of status, reason, suspended_until on public.user_moderation_profiles
for each row
execute function public.loadlink_notify_user_moderation();

-- ---------------------------------------------------------------------------
-- 6) Payment changes create private user notifications
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_notify_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_message text;
  v_amount text;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return new;
    end if;
  end if;

  v_amount := upper(coalesce(new.currency, 'ZAR')) || ' ' || to_char(coalesce(new.amount_cents, 0) / 100.0, 'FM999999990.00');

  if new.status = 'paid' then
    v_title := 'Payment received';
    v_message := 'We received ' || v_amount || '. Reference: ' || new.reference || '.';
  elsif new.status = 'refunded' then
    v_title := 'Payment refunded';
    v_message := 'Your payment ' || new.reference || ' was refunded.';
  elsif new.status = 'failed' then
    v_title := 'Payment failed';
    v_message := 'Payment ' || new.reference || ' was not successful.';
  elsif new.status = 'cancelled' then
    v_title := 'Payment cancelled';
    v_message := 'Payment ' || new.reference || ' was cancelled.';
  else
    v_title := 'Payment recorded';
    v_message := 'Your payment is being processed. Reference: ' || new.reference || '.';
  end if;

  insert into public.user_notifications (
    user_id, type, title, message, entity_type, entity_id, action_url, metadata
  ) values (
    new.user_id,
    'payment_' || new.status,
    v_title,
    v_message,
    'payment',
    new.id,
    null,
    jsonb_build_object(
      'status', new.status,
      'reference', new.reference,
      'amount_cents', new.amount_cents,
      'currency', new.currency
    )
  );

  return new;
end;
$$;

revoke all on function public.loadlink_notify_payment_change() from public;

drop trigger if exists loadlink_payment_insert_notification on public.admin_payments;
create trigger loadlink_payment_insert_notification
after insert on public.admin_payments
for each row
execute function public.loadlink_notify_payment_change();

drop trigger if exists loadlink_payment_update_notification on public.admin_payments;
create trigger loadlink_payment_update_notification
after update of status on public.admin_payments
for each row
execute function public.loadlink_notify_payment_change();

-- The public website never receives the admin site's URL, secret key or team data.
-- All actions are connected through the shared Supabase database and protected policies.
