-- LOADLINK PHASE 1 — REMAINING 50%
-- Additive migration for packages, paid vehicle access, moderation syncing,
-- verification decisions, notifications, analytics and account restrictions.
-- This migration does not delete existing users, listings, chats or auth data.
-- Install this after the existing LoadLink Phase 1 foundation migrations.

create extension if not exists pgcrypto;

-- Shared administrator identity must exist before listing-security functions
-- are compiled later in this migration. The final bootstrap repeats safely.
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
alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists department text;
alter table public.admin_users add column if not exists is_active boolean not null default true;
alter table public.admin_users add column if not exists last_seen_at timestamptz;
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();

create or replace function public.is_loadlink_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid() and is_active=true);
$$;
revoke all on function public.is_loadlink_admin() from public;
grant execute on function public.is_loadlink_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Shared notification contract used by the public site and Control Centre
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  message text not null default '',
  body text,
  action_url text,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.user_notifications add column if not exists message text not null default '';
alter table public.user_notifications add column if not exists body text;
alter table public.user_notifications add column if not exists action_url text;
alter table public.user_notifications add column if not exists entity_type text;
alter table public.user_notifications add column if not exists entity_id uuid;
alter table public.user_notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.user_notifications add column if not exists is_read boolean not null default false;
alter table public.user_notifications add column if not exists read_at timestamptz;
alter table public.user_notifications add column if not exists created_at timestamptz not null default now();
update public.user_notifications set message = coalesce(nullif(message,''), body, '') where coalesce(message,'') = '';
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_unread_idx on public.user_notifications(user_id, is_read, created_at desc);
alter table public.user_notifications enable row level security;
drop policy if exists "users read own notifications" on public.user_notifications;
create policy "users read own notifications" on public.user_notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "users update own notifications" on public.user_notifications;
create policy "users update own notifications" on public.user_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, delete on public.user_notifications from anon, authenticated;
grant select, update on public.user_notifications to authenticated;

-- ---------------------------------------------------------------------------
-- 2. User moderation status shared with messaging, listings and subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.user_moderation_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','flagged','suspended','blocked')),
  reason text,
  internal_notes text,
  strike_count integer not null default 0 check (strike_count >= 0),
  suspended_until timestamptz,
  last_action_by uuid references auth.users(id) on delete set null,
  last_action_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_moderation_profiles enable row level security;
revoke all on public.user_moderation_profiles from anon, authenticated;

create or replace function public.loadlink_account_status(p_user_id uuid default auth.uid())
returns text
language sql stable security definer set search_path=public,pg_temp as $$
  select case
    when p_user_id is null then 'active'
    when coalesce((select status from public.user_moderation_profiles where user_id=p_user_id),'active')='suspended'
      and coalesce((select suspended_until from public.user_moderation_profiles where user_id=p_user_id), now()+interval '1 day') <= now()
      then 'active'
    else coalesce((select status from public.user_moderation_profiles where user_id=p_user_id),'active')
  end;
$$;
revoke all on function public.loadlink_account_status(uuid) from public;
grant execute on function public.loadlink_account_status(uuid) to authenticated;

-- Shared immutable audit trail written by the Control Centre service role.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs add column if not exists admin_user_id uuid references auth.users(id) on delete set null;
alter table public.admin_audit_logs add column if not exists action text;
alter table public.admin_audit_logs add column if not exists entity_type text;
alter table public.admin_audit_logs add column if not exists entity_id uuid;
alter table public.admin_audit_logs add column if not exists reason text;
alter table public.admin_audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.admin_audit_logs add column if not exists created_at timestamptz not null default now();
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type,entity_id,created_at desc);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon,authenticated;

-- ---------------------------------------------------------------------------
-- 3. Canonical package tables and fields
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  code text primary key check (code in ('pro','dealer')),
  name text not null,
  price_cents bigint not null check (price_cents >= 0),
  currency text not null default 'ZAR',
  billing_interval text not null default 'month',
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.subscription_plans(code,name,price_cents,currency,billing_interval,benefits)
values
 ('pro','Pro',39900,'ZAR','month','["Unlimited vehicle listings","15 photos per listing","Unlimited messages","Pro analytics","Featured visibility"]'::jsonb),
 ('dealer','Dealer',299900,'ZAR','month','["Everything in Pro","Dealership profile","Inventory tools","Staff access","Dealer analytics"]'::jsonb)
on conflict (code) do update set name=excluded.name, currency=excluded.currency, updated_at=now();

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null default 'pending' check (status in ('pending','trial','active','past_due','suspended','cancelled','expired')),
  amount_cents bigint not null default 0,
  currency text not null default 'ZAR',
  starts_at timestamptz,
  renews_at timestamptz,
  current_period_end timestamptz,
  ends_at timestamptz,
  payment_id uuid,
  suspension_reason text,
  cancellation_reason text,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_subscriptions add column if not exists amount_cents bigint not null default 0;
alter table public.user_subscriptions add column if not exists currency text not null default 'ZAR';
alter table public.user_subscriptions add column if not exists current_period_end timestamptz;
alter table public.user_subscriptions add column if not exists suspension_reason text;
alter table public.user_subscriptions add column if not exists cancelled_at timestamptz;
alter table public.user_subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_status_check;
alter table public.user_subscriptions add constraint user_subscriptions_status_check check (status in ('pending','trial','active','past_due','suspended','cancelled','expired'));
create index if not exists user_subscriptions_user_status_idx on public.user_subscriptions(user_id,status,created_at desc);
create unique index if not exists user_subscriptions_one_active_idx on public.user_subscriptions(user_id) where status in ('trial','active','past_due','suspended');
alter table public.user_subscriptions enable row level security;
drop policy if exists "users read own subscriptions" on public.user_subscriptions;
create policy "users read own subscriptions" on public.user_subscriptions for select to authenticated using (user_id=auth.uid());
revoke insert, update, delete on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;

create or replace function public.loadlink_sync_subscription_fields()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.currency := upper(coalesce(nullif(new.currency,''),'ZAR'));
  new.current_period_end := coalesce(new.current_period_end,new.renews_at,new.ends_at);
  new.renews_at := coalesce(new.renews_at,new.current_period_end);
  new.ends_at := coalesce(new.ends_at,new.current_period_end);
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists loadlink_sync_subscription_fields_trigger on public.user_subscriptions;
create trigger loadlink_sync_subscription_fields_trigger before insert or update on public.user_subscriptions for each row execute function public.loadlink_sync_subscription_fields();

create table if not exists public.admin_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  listing_id uuid,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','cancelled')),
  provider text not null default 'manual',
  reference text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_payments add column if not exists external_reference text;
alter table public.admin_payments add column if not exists provider_transaction_id text;
alter table public.admin_payments add column if not exists payment_method text;
alter table public.admin_payments add column if not exists payer_email text;
alter table public.admin_payments add column if not exists description text;
alter table public.admin_payments add column if not exists reconciliation_status text not null default 'unmatched';
alter table public.admin_payments add column if not exists reconciled_at timestamptz;
alter table public.admin_payments add column if not exists reconciled_by uuid references auth.users(id) on delete set null;
alter table public.admin_payments add column if not exists due_at timestamptz;
alter table public.admin_payments add column if not exists settled_at timestamptz;
alter table public.admin_payments add column if not exists refunded_at timestamptz;
alter table public.admin_payments add column if not exists refund_reference text;
alter table public.admin_payments add column if not exists receipt_url text;
alter table public.admin_payments add column if not exists notes text;
alter table public.admin_payments add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists admin_payments_reference_idx on public.admin_payments(reference);
create index if not exists admin_payments_status_created_idx on public.admin_payments(status,created_at desc);
create index if not exists admin_payments_user_created_idx on public.admin_payments(user_id,created_at desc);
create sequence if not exists public.loadlink_payment_reference_seq start with 100001;
create or replace function public.loadlink_generate_payment_reference()
returns text language sql volatile security definer set search_path=public,pg_temp as $$
  select 'LL-PAY-' || to_char(now() at time zone 'UTC','YYYYMMDD') || '-' || lpad(nextval('public.loadlink_payment_reference_seq')::text,6,'0');
$$;

create or replace function public.loadlink_payment_defaults()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.reference is null or btrim(new.reference)='' then new.reference := public.loadlink_generate_payment_reference(); end if;
  new.reference := upper(btrim(new.reference));
  new.currency := upper(coalesce(nullif(btrim(new.currency),''),'ZAR'));
  if new.status='paid' and new.settled_at is null then new.settled_at := now(); end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists loadlink_payment_defaults_trigger on public.admin_payments;
create trigger loadlink_payment_defaults_trigger before insert or update on public.admin_payments for each row execute function public.loadlink_payment_defaults();
create unique index if not exists admin_payments_reference_unique_idx on public.admin_payments(lower(reference)) where reference is not null;

create table if not exists public.manual_listing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid references public.admin_payments(id) on delete set null,
  days integer not null check (days between 1 and 365),
  daily_price_cents integer not null default 1500,
  amount_cents bigint not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create table if not exists public.listing_access_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manual_payment_id uuid references public.manual_listing_payments(id) on delete set null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_listing_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists listing_access_periods_available_idx on public.listing_access_periods(user_id,expires_at) where consumed_at is null;
alter table public.manual_listing_payments enable row level security;
alter table public.listing_access_periods enable row level security;
drop policy if exists "users read own manual payments" on public.manual_listing_payments;
create policy "users read own manual payments" on public.manual_listing_payments for select to authenticated using (user_id=auth.uid());
drop policy if exists "users read own listing access" on public.listing_access_periods;
create policy "users read own listing access" on public.listing_access_periods for select to authenticated using (user_id=auth.uid());
grant select on public.manual_listing_payments, public.listing_access_periods to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Listing fields, paid vehicle enforcement and public visibility
-- ---------------------------------------------------------------------------
alter table public.job_listings add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.job_listings add column if not exists listing_kind text not null default 'job';
alter table public.job_listings add column if not exists package_type text not null default 'standard';
alter table public.job_listings add column if not exists status text not null default 'active';
alter table public.job_listings add column if not exists moderation_status text not null default 'pending';
alter table public.job_listings add column if not exists moderation_notes text;
alter table public.job_listings add column if not exists moderated_at timestamptz;
alter table public.job_listings add column if not exists moderated_by uuid references auth.users(id) on delete set null;
alter table public.job_listings add column if not exists expires_at timestamptz;
alter table public.job_listings add column if not exists listing_access_period_id uuid references public.listing_access_periods(id) on delete set null;
alter table public.job_listings add column if not exists payment_status text not null default 'not_required';
alter table public.job_listings add column if not exists payment_reference text;
alter table public.job_listings add column if not exists featured_until timestamptz;

update public.job_listings set listing_kind='job' where listing_kind is null or btrim(listing_kind)='';
update public.job_listings set listing_kind='vehicle' where listing_kind in ('truck_sale','asset','vehicle_listing');
alter table public.job_listings enable row level security;
update public.job_listings set package_type='standard' where package_type is null or btrim(package_type)='';
create index if not exists job_listings_public_idx on public.job_listings(moderation_status,status,expires_at,created_at desc);
create index if not exists job_listings_owner_idx on public.job_listings(user_id,created_at desc);

create or replace function public.loadlink_active_plan(p_user_id uuid default auth.uid())
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select plan_code from public.user_subscriptions
  where user_id=p_user_id
    and status in ('trial','active')
    and coalesce(ends_at,current_period_end,renews_at,now()+interval '1 day') > now()
  order by case plan_code when 'dealer' then 2 else 1 end desc, created_at desc
  limit 1;
$$;
revoke all on function public.loadlink_active_plan(uuid) from public;
grant execute on function public.loadlink_active_plan(uuid) to authenticated;

create or replace function public.loadlink_get_vehicle_listing_access()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_plan text;
  v_subscription public.user_subscriptions%rowtype;
  v_period public.listing_access_periods%rowtype;
begin
  if v_user is null or public.loadlink_account_status(v_user) in ('suspended','blocked') then
    return jsonb_build_object('allowed',false,'plan',null,'source',null,'photo_limit',0,'daily_message_limit',0,'analytics_enabled',false,'featured_enabled',false);
  end if;
  select * into v_subscription
  from public.user_subscriptions
  where user_id=v_user and status in ('trial','active')
    and coalesce(ends_at,current_period_end,renews_at,now()+interval '1 day')>now()
  order by case plan_code when 'dealer' then 2 else 1 end desc,created_at desc
  limit 1;
  v_plan:=v_subscription.plan_code;
  if v_plan in ('pro','dealer') then
    return jsonb_build_object(
      'allowed',true,'plan',v_plan,'source','subscription',
      'subscription_status',v_subscription.status,
      'expires_at',coalesce(v_subscription.ends_at,v_subscription.current_period_end,v_subscription.renews_at),
      'photo_limit',15,'daily_message_limit',null,'analytics_enabled',true,'featured_enabled',true
    );
  end if;
  select * into v_period from public.listing_access_periods
  where user_id=v_user and consumed_at is null and expires_at>now()
  order by expires_at asc limit 1;
  if found then
    return jsonb_build_object('allowed',true,'plan','manual','source','manual_access','expires_at',v_period.expires_at,'access_period_id',v_period.id,'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false);
  end if;
  return jsonb_build_object('allowed',false,'plan',null,'source',null,'photo_limit',0,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false);
end;
$$;
revoke all on function public.loadlink_get_vehicle_listing_access() from public;
grant execute on function public.loadlink_get_vehicle_listing_access() to authenticated;

create or replace function public.loadlink_request_manual_listing_payment(p_days integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_days integer; v_amount bigint; v_payment public.admin_payments%rowtype; v_manual uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if public.loadlink_account_status(v_user) in ('suspended','blocked') then raise exception 'Account access is restricted'; end if;
  v_days := greatest(1,least(365,coalesce(p_days,1))); v_amount := v_days*1500;
  insert into public.admin_payments(user_id,amount_cents,currency,status,provider,description,metadata)
  values(v_user,v_amount,'ZAR','pending','manual','Manual vehicle listing access',jsonb_build_object('source','manual_listing','days',v_days)) returning * into v_payment;
  insert into public.manual_listing_payments(user_id,payment_id,days,daily_price_cents,amount_cents,status)
  values(v_user,v_payment.id,v_days,1500,v_amount,'pending') returning id into v_manual;
  update public.admin_payments set metadata=metadata||jsonb_build_object('manual_payment_id',v_manual) where id=v_payment.id;
  return jsonb_build_object('payment_id',v_payment.id,'reference',v_payment.reference,'days',v_days,'amount_cents',v_amount,'status','pending');
end;
$$;

create or replace function public.loadlink_request_subscription(p_plan_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_plan public.subscription_plans%rowtype; v_payment public.admin_payments%rowtype; v_sub uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if p_plan_code not in ('pro','dealer') then raise exception 'Invalid package'; end if;
  if public.loadlink_account_status(v_user) in ('suspended','blocked') then raise exception 'Account access is restricted'; end if;
  select * into v_plan from public.subscription_plans where code=p_plan_code and is_active=true;
  if not found then raise exception 'Package unavailable'; end if;
  delete from public.user_subscriptions where user_id=v_user and status='pending';
  insert into public.admin_payments(user_id,amount_cents,currency,status,provider,description,metadata)
  values(v_user,v_plan.price_cents,v_plan.currency,'pending','manual',v_plan.name||' subscription',jsonb_build_object('source','subscription','plan_code',p_plan_code)) returning * into v_payment;
  insert into public.user_subscriptions(user_id,plan_code,status,amount_cents,currency,payment_id,metadata)
  values(v_user,p_plan_code,'pending',v_plan.price_cents,v_plan.currency,v_payment.id,jsonb_build_object('requested_from','website')) returning id into v_sub;
  update public.admin_payments set metadata=metadata||jsonb_build_object('subscription_id',v_sub) where id=v_payment.id;
  return jsonb_build_object('payment_id',v_payment.id,'reference',v_payment.reference,'plan',p_plan_code,'amount_cents',v_plan.price_cents,'status','pending');
end;
$$;

create or replace function public.loadlink_request_listing_renewal(p_listing_id uuid,p_days integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_days integer; v_amount bigint; v_payment public.admin_payments%rowtype;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.job_listings where id=p_listing_id and user_id=v_user) then raise exception 'You do not own this listing'; end if;
  v_days:=greatest(1,least(365,coalesce(p_days,1))); v_amount:=v_days*1500;
  insert into public.admin_payments(user_id,listing_id,amount_cents,currency,status,provider,description,metadata)
  values(v_user,p_listing_id,v_amount,'ZAR','pending','manual','Vehicle listing renewal',jsonb_build_object('source','listing_renewal','days',v_days,'listing_id',p_listing_id)) returning * into v_payment;
  return jsonb_build_object('payment_id',v_payment.id,'reference',v_payment.reference,'listing_id',p_listing_id,'days',v_days,'amount_cents',v_amount,'status','pending');
end;
$$;

revoke all on function public.loadlink_request_manual_listing_payment(integer) from public;
revoke all on function public.loadlink_request_subscription(text) from public;
revoke all on function public.loadlink_request_listing_renewal(uuid,integer) from public;
grant execute on function public.loadlink_request_manual_listing_payment(integer) to authenticated;
grant execute on function public.loadlink_request_subscription(text) to authenticated;
grant execute on function public.loadlink_request_listing_renewal(uuid,integer) to authenticated;

create or replace function public.loadlink_enforce_listing_access()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_plan text; v_period public.listing_access_periods%rowtype; v_limit integer; v_count integer;
begin
  if new.user_id is null then new.user_id:=auth.uid(); end if;
  if new.user_id is null then raise exception 'Sign in required'; end if;
  if new.user_id<>auth.uid() and not public.is_loadlink_admin() then raise exception 'Invalid listing owner'; end if;
  if public.loadlink_account_status(new.user_id) in ('suspended','blocked') then raise exception 'Account access is restricted'; end if;
  new.moderation_status:='pending'; new.moderated_at:=null; new.moderated_by:=null;
  if coalesce(new.listing_kind,'job')<>'vehicle' then
    new.package_type:=coalesce(nullif(new.package_type,''),'standard');
    new.payment_status:='not_required';
    return new;
  end if;
  v_plan:=public.loadlink_active_plan(new.user_id);
  if v_plan in ('pro','dealer') then
    new.package_type:=v_plan; new.payment_status:='paid'; new.expires_at:=coalesce(new.expires_at,now()+interval '30 days'); v_limit:=15;
  else
    select * into v_period from public.listing_access_periods where user_id=new.user_id and consumed_at is null and expires_at>now() order by expires_at asc limit 1 for update;
    if not found then raise exception 'Vehicle listings require paid Manual, Pro or Dealer access'; end if;
    new.package_type:='manual'; new.payment_status:='paid'; new.expires_at:=v_period.expires_at; new.listing_access_period_id:=v_period.id; v_limit:=5;
  end if;
  v_count:=coalesce(array_length(new.photos,1),0);
  if v_count>v_limit then raise exception 'This package allows a maximum of % photos',v_limit; end if;
  if v_period.id is not null then update public.listing_access_periods set consumed_at=now() where id=v_period.id; end if;
  return new;
end;
$$;
drop trigger if exists loadlink_enforce_listing_access_trigger on public.job_listings;
create trigger loadlink_enforce_listing_access_trigger before insert on public.job_listings for each row execute function public.loadlink_enforce_listing_access();

create or replace function public.loadlink_link_consumed_access()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.listing_access_period_id is not null then update public.listing_access_periods set consumed_listing_id=new.id where id=new.listing_access_period_id; end if;
  return new;
end;
$$;
drop trigger if exists loadlink_link_consumed_access_trigger on public.job_listings;
create trigger loadlink_link_consumed_access_trigger after insert on public.job_listings for each row execute function public.loadlink_link_consumed_access();

-- Owner-only deletion also releases a still-valid manual access period when the
-- vehicle submission never reached approval. This prevents a failed document
-- upload from consuming the user's paid listing access.
create or replace function public.delete_my_listing(p_listing_id uuid,p_owner_key text default '')
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.job_listings%rowtype; v_deleted integer;
begin
  select * into v_row from public.job_listings where id=p_listing_id for update;
  if not found then return false; end if;
  if auth.uid() is null or not (v_row.user_id=auth.uid() or (length(coalesce(p_owner_key,''))>=20 and v_row.owner_key=p_owner_key)) then return false; end if;
  delete from public.job_listings where id=p_listing_id;
  get diagnostics v_deleted=row_count;
  if v_deleted=1 and v_row.listing_access_period_id is not null and coalesce(v_row.moderation_status,'pending')<>'approved' then
    update public.listing_access_periods
       set consumed_at=null,consumed_listing_id=null
     where id=v_row.listing_access_period_id and user_id=auth.uid() and expires_at>now();
  end if;
  return v_deleted=1;
end;
$$;
revoke all on function public.delete_my_listing(uuid,text) from public;
grant execute on function public.delete_my_listing(uuid,text) to authenticated;

-- Keep public results limited to approved, active, unexpired listings.
drop policy if exists "loadlink_jobs_read_approved_or_own" on public.job_listings;
create policy "loadlink_jobs_read_approved_or_own" on public.job_listings for select to anon,authenticated using (
  (moderation_status='approved' and coalesce(status,'active')='active' and (expires_at is null or expires_at>now()))
  or user_id=auth.uid()
);

create or replace function public.get_public_job_listings()
returns setof public.job_listings language sql stable security definer set search_path=public,pg_temp as $$
  select * from public.job_listings
  where moderation_status='approved'
    and coalesce(status,'active')='active'
    and (expires_at is null or expires_at>now())
  order by created_at desc nulls last;
$$;
revoke all on function public.get_public_job_listings() from public;
grant execute on function public.get_public_job_listings() to anon,authenticated;

-- ---------------------------------------------------------------------------
-- 5. Verification workflow and profile badge sync
-- ---------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  id_type text not null,
  id_number_last4 text not null,
  id_document_path text not null,
  selfie_path text not null,
  company_document_path text,
  status text not null default 'pending',
  reviewer_notes text,
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.verification_requests add column if not exists reviewer_notes text;
alter table public.verification_requests add column if not exists rejection_reason text;
alter table public.verification_requests add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.verification_requests add column if not exists reviewed_at timestamptz;
alter table public.verification_requests add column if not exists submitted_at timestamptz not null default now();
alter table public.verification_requests add column if not exists updated_at timestamptz not null default now();
alter table public.verification_requests drop constraint if exists verification_requests_status_check;
alter table public.verification_requests add constraint verification_requests_status_check check(status in ('phone_verified','pending','under_review','more_information_required','verified','rejected'));
alter table public.verification_requests enable row level security;
-- Remove earlier policy names so permissive RLS policies cannot accidentally
-- let a user award themselves a verification decision.
drop policy if exists "users create own verification" on public.verification_requests;
drop policy if exists "users replace own pending verification" on public.verification_requests;
drop policy if exists "admins update verification" on public.verification_requests;
drop policy if exists "users submit own verification" on public.verification_requests;
drop policy if exists "users read own verification" on public.verification_requests;
drop policy if exists "users update own rejected verification" on public.verification_requests;
create policy "users read own verification" on public.verification_requests
  for select to authenticated using(user_id=auth.uid());
create policy "users submit own verification" on public.verification_requests
  for insert to authenticated with check(
    user_id=auth.uid() and status='pending' and reviewed_at is null and reviewed_by is null
  );
create policy "users update own verification resubmission" on public.verification_requests
  for update to authenticated
  using(user_id=auth.uid() and status in ('pending','rejected','more_information_required'))
  with check(
    user_id=auth.uid() and status='pending' and reviewed_at is null and reviewed_by is null
  );
grant select,insert,update on public.verification_requests to authenticated;

-- Private identity and vehicle-document buckets. Only the submitting account
-- can access its folder; the Control Centre service role bypasses RLS.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('verification-documents','verification-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']),
  ('vehicle-verification','vehicle-verification',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "users upload own verification documents" on storage.objects;
create policy "users upload own verification documents" on storage.objects
  for insert to authenticated with check(
    bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text
  );
drop policy if exists "users read own verification documents" on storage.objects;
create policy "users read own verification documents" on storage.objects
  for select to authenticated using(
    bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text
  );
drop policy if exists "users replace own verification documents" on storage.objects;
create policy "users replace own verification documents" on storage.objects
  for update to authenticated
  using(bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text)
  with check(bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "vehicle owners upload own verification files" on storage.objects;
create policy "vehicle owners upload own verification files" on storage.objects
  for insert to authenticated with check(
    bucket_id='vehicle-verification' and (storage.foldername(name))[1]=auth.uid()::text
  );
drop policy if exists "vehicle owners read own verification files" on storage.objects;
create policy "vehicle owners read own verification files" on storage.objects
  for select to authenticated using(
    bucket_id='vehicle-verification' and (storage.foldername(name))[1]=auth.uid()::text
  );
drop policy if exists "vehicle owners replace own verification files" on storage.objects;
create policy "vehicle owners replace own verification files" on storage.objects
  for update to authenticated
  using(bucket_id='vehicle-verification' and (storage.foldername(name))[1]=auth.uid()::text)
  with check(bucket_id='vehicle-verification' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.loadlink_sync_profile_verification()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'update public.profiles set verification_status=$1 where id=$2'
      using case when new.status='verified' then 'verified' when new.status='rejected' then 'rejected' else 'pending' end, new.user_id;
  end if;
  return new;
exception when undefined_column then return new;
end;
$$;
drop trigger if exists loadlink_sync_profile_verification_trigger on public.verification_requests;
create trigger loadlink_sync_profile_verification_trigger after insert or update of status on public.verification_requests for each row execute function public.loadlink_sync_profile_verification();

-- ---------------------------------------------------------------------------
-- 6. Pro analytics event collection and protected analytics RPC
-- ---------------------------------------------------------------------------
-- Preserve and continue using the view-event table already populated by
-- the current LoadLink listing pages.
create table if not exists public.job_view_events (
  id bigint generated by default as identity primary key,
  job_id uuid not null references public.job_listings(id) on delete cascade,
  viewer_hash text,
  viewer_user_id uuid references auth.users(id) on delete set null,
  device_type text not null default 'unknown',
  source text not null default 'direct',
  viewed_at timestamptz not null default now()
);
alter table public.job_view_events add column if not exists viewer_hash text;
alter table public.job_view_events add column if not exists viewer_user_id uuid references auth.users(id) on delete set null;
alter table public.job_view_events add column if not exists device_type text not null default 'unknown';
alter table public.job_view_events add column if not exists source text not null default 'direct';
alter table public.job_view_events add column if not exists viewed_at timestamptz not null default now();
create index if not exists job_view_events_job_time_idx on public.job_view_events(job_id,viewed_at desc);
create index if not exists job_view_events_viewer_idx on public.job_view_events(job_id,viewer_hash);
alter table public.job_view_events enable row level security;
revoke all on public.job_view_events from anon,authenticated;

create table if not exists public.listing_analytics_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete set null,
  viewer_hash text,
  event_type text not null default 'view' check(event_type in ('view','save','message','share')),
  source text not null default 'direct',
  device text not null default 'unknown',
  created_at timestamptz not null default now()
);
create index if not exists listing_analytics_listing_created_idx on public.listing_analytics_events(listing_id,created_at desc);
create index if not exists listing_analytics_viewer_idx on public.listing_analytics_events(listing_id,viewer_hash,event_type,created_at desc) where viewer_hash is not null;
alter table public.listing_analytics_events enable row level security;
revoke all on public.listing_analytics_events from anon,authenticated;

create or replace function public.loadlink_record_listing_event(p_listing_id uuid,p_event_type text default 'view',p_source text default 'direct',p_device text default 'unknown',p_viewer_hash text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_event_type not in ('view','save','message','share') then raise exception 'Invalid analytics event'; end if;
  if not exists(select 1 from public.job_listings where id=p_listing_id and moderation_status='approved') then return false; end if;
  insert into public.listing_analytics_events(listing_id,viewer_user_id,viewer_hash,event_type,source,device)
  values(p_listing_id,auth.uid(),nullif(left(coalesce(p_viewer_hash,''),160),''),p_event_type,left(coalesce(nullif(p_source,''),'direct'),80),left(coalesce(nullif(p_device,''),'unknown'),80))
  on conflict do nothing;
  if p_event_type='view' then update public.job_listings set view_count=coalesce(view_count,0)+1,last_viewed_at=now() where id=p_listing_id; end if;
  return true;
end;
$$;
revoke all on function public.loadlink_record_listing_event(uuid,text,text,text,text) from public;
grant execute on function public.loadlink_record_listing_event(uuid,text,text,text,text) to anon,authenticated;

create or replace function public.loadlink_get_listing_analytics(p_listing_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_listing public.job_listings%rowtype; v_result jsonb; v_plan text;
begin
  select * into v_listing from public.job_listings where id=p_listing_id;
  if not found or v_listing.user_id<>auth.uid() then raise exception 'You do not own this listing'; end if;
  v_plan:=public.loadlink_active_plan(auth.uid());
  if v_plan not in ('pro','dealer') then raise exception 'An active Pro or Dealer package is required for analytics'; end if;
  select jsonb_build_object(
    'total_views',greatest(coalesce(v_listing.view_count,0),(select count(*)::int from public.job_view_events where job_id=p_listing_id)),
    'unique_viewers',coalesce((select count(distinct coalesce(viewer_user_id::text,viewer_hash)) from public.job_view_events where job_id=p_listing_id),0),
    'last_viewed_at',coalesce((select max(viewed_at) from public.job_view_events where job_id=p_listing_id),v_listing.last_viewed_at),
    'saves',(select count(*)::int from public.listing_analytics_events where listing_id=p_listing_id and event_type='save'),
    'messages',(select count(*)::int from public.listing_analytics_events where listing_id=p_listing_id and event_type='message'),
    'shares',(select count(*)::int from public.listing_analytics_events where listing_id=p_listing_id and event_type='share'),
    'daily_views',coalesce((select jsonb_agg(jsonb_build_object('label',to_char(day,'Dy'),'count',count) order by day) from (
      select d::date day,count(e.id)::int count
      from generate_series(current_date-6,current_date,'1 day') d
      left join public.job_view_events e on e.job_id=p_listing_id and e.viewed_at::date=d::date
      group by d::date
    ) q),'[]'::jsonb),
    'devices',coalesce((select jsonb_agg(jsonb_build_object('label',device_type,'count',count) order by count desc) from (
      select coalesce(device_type,'unknown') device_type,count(*)::int count from public.job_view_events where job_id=p_listing_id group by 1
    ) q),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(jsonb_build_object('label',source,'count',count) order by count desc) from (
      select coalesce(source,'direct') source,count(*)::int count from public.job_view_events where job_id=p_listing_id group by 1
    ) q),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.loadlink_get_listing_analytics(uuid) from public;
grant execute on function public.loadlink_get_listing_analytics(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Payment settlement automation
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_apply_paid_payment()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_source text; v_days integer; v_manual uuid; v_sub uuid; v_listing uuid; v_plan text;
begin
  if new.status<>'paid' or (tg_op='UPDATE' and old.status='paid') then return new; end if;
  v_source:=coalesce(new.metadata->>'source','');
  if v_source='manual_listing' then
    v_manual:=nullif(new.metadata->>'manual_payment_id','')::uuid;
    v_days:=greatest(1,least(365,coalesce((new.metadata->>'days')::integer,1)));
    update public.manual_listing_payments set status='paid',paid_at=coalesce(paid_at,now()) where id=v_manual;
    if not exists(select 1 from public.listing_access_periods where manual_payment_id=v_manual) then
      insert into public.listing_access_periods(user_id,manual_payment_id,starts_at,expires_at) values(new.user_id,v_manual,now(),now()+make_interval(days=>v_days));
    end if;
  elsif v_source='subscription' then
    v_sub:=nullif(new.metadata->>'subscription_id','')::uuid; v_plan:=new.metadata->>'plan_code';
    update public.user_subscriptions set status='active',starts_at=coalesce(starts_at,now()),renews_at=now()+interval '30 days',current_period_end=now()+interval '30 days',ends_at=now()+interval '30 days',payment_id=new.id,suspension_reason=null where id=v_sub;
  elsif v_source='listing_renewal' then
    v_listing:=coalesce(new.listing_id,nullif(new.metadata->>'listing_id','')::uuid); v_days:=greatest(1,least(365,coalesce((new.metadata->>'days')::integer,1)));
    update public.job_listings set expires_at=greatest(coalesce(expires_at,now()),now())+make_interval(days=>v_days),payment_status='paid',payment_reference=new.reference where id=v_listing;
  end if;
  if to_regclass('public.billing_history') is not null then
    execute 'update public.billing_history set status=''paid'' where payment_id=$1' using new.id;
  end if;
  if new.user_id is not null then
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
    values(new.user_id,'payment_paid','Payment confirmed','Payment '||coalesce(new.reference,new.id::text)||' was confirmed and the related LoadLink access has been updated.','/account/packages','payment',new.id,jsonb_build_object('reference',new.reference,'source',v_source,'amount_cents',new.amount_cents));
  end if;
  return new;
end;
$$;
drop trigger if exists loadlink_apply_paid_package_trigger on public.admin_payments;
drop trigger if exists loadlink_apply_paid_payment_trigger on public.admin_payments;
create trigger loadlink_apply_paid_payment_trigger after insert or update of status on public.admin_payments for each row execute function public.loadlink_apply_paid_payment();

-- ---------------------------------------------------------------------------
-- 8. Automatic user notifications when Control Centre decisions change data
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_notify_listing_submitted()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.user_id is not null then
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
    values(new.user_id,'listing_submitted','Your post was submitted','“'||coalesce(new.title,'Your listing')||'” was received and is waiting for review.','/my-posts','job_listing',new.id,jsonb_build_object('status',new.moderation_status,'listing_kind',new.listing_kind));
  end if;
  return new;
end;
$$;
drop trigger if exists loadlink_notify_listing_submitted_trigger on public.job_listings;
create trigger loadlink_notify_listing_submitted_trigger after insert on public.job_listings for each row execute function public.loadlink_notify_listing_submitted();

create or replace function public.loadlink_notify_verification_submitted()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(new.user_id,'verification_submitted','Verification submitted','Your identity documents were received and are waiting for review.','/verification-status','verification_request',new.id,jsonb_build_object('status',new.status));
  return new;
end;
$$;
drop trigger if exists loadlink_notify_verification_submitted_trigger on public.verification_requests;
create trigger loadlink_notify_verification_submitted_trigger after insert on public.verification_requests for each row execute function public.loadlink_notify_verification_submitted();

create or replace function public.loadlink_notify_listing_decision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.user_id is null or new.moderation_status is not distinct from old.moderation_status then return new; end if;
  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(new.user_id,'listing_'||new.moderation_status,
    case new.moderation_status when 'approved' then 'Your post was approved' when 'rejected' then 'Your post needs attention' else 'Your post is under review' end,
    case new.moderation_status when 'approved' then '“'||coalesce(new.title,'Your listing')||'” is now live on LoadLink.' when 'rejected' then '“'||coalesce(new.title,'Your listing')||'” was rejected. '||coalesce(new.moderation_notes,'Review the listing requirements and update your post.') else '“'||coalesce(new.title,'Your listing')||'” is being reviewed.' end,
    '/my-posts','job_listing',new.id,jsonb_build_object('status',new.moderation_status,'reason',new.moderation_notes));
  return new;
end;
$$;
drop trigger if exists loadlink_notify_listing_decision_trigger on public.job_listings;
create trigger loadlink_notify_listing_decision_trigger after update of moderation_status on public.job_listings for each row execute function public.loadlink_notify_listing_decision();

create or replace function public.loadlink_notify_identity_decision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(new.user_id,'verification_'||new.status,
    case new.status when 'verified' then 'Verification approved' when 'rejected' then 'Verification needs attention' when 'more_information_required' then 'More verification information required' else 'Verification updated' end,
    case new.status when 'verified' then 'Your LoadLink identity verification has been approved.' when 'rejected' then coalesce(new.rejection_reason,new.reviewer_notes,'Your verification could not be approved.') when 'more_information_required' then coalesce(new.reviewer_notes,'Please update your verification documents.') else 'Your verification is now '||replace(new.status,'_',' ')||'.' end,
    '/verification-status','verification_request',new.id,jsonb_build_object('status',new.status));
  return new;
end;
$$;
drop trigger if exists loadlink_notify_identity_decision_trigger on public.verification_requests;
create trigger loadlink_notify_identity_decision_trigger after update of status on public.verification_requests for each row execute function public.loadlink_notify_identity_decision();

create or replace function public.loadlink_notify_subscription_decision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(new.user_id,'subscription_'||new.status,upper(new.plan_code)||' package updated','Your LoadLink package status is now '||replace(new.status,'_',' ')||'.','/account/packages','subscription',new.id,jsonb_build_object('plan',new.plan_code,'status',new.status));
  return new;
end;
$$;
drop trigger if exists loadlink_notify_subscription_decision_trigger on public.user_subscriptions;
create trigger loadlink_notify_subscription_decision_trigger after update of status on public.user_subscriptions for each row execute function public.loadlink_notify_subscription_decision();

-- ---------------------------------------------------------------------------
-- 9. Messaging package enforcement shared with the existing chat functions
-- ---------------------------------------------------------------------------
create table if not exists public.user_chat_access_keys (
  access_key_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.user_chat_access_keys enable row level security;
revoke all on public.user_chat_access_keys from anon,authenticated;

create or replace function public.loadlink_register_chat_access_key(p_access_key text)
returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_hash text;
begin
  if auth.uid() is null or length(coalesce(p_access_key,''))<20 then return false; end if;
  if public.loadlink_account_status(auth.uid()) in ('suspended','blocked') then return false; end if;
  v_hash:=encode(digest(p_access_key,'sha256'),'hex');
  insert into public.user_chat_access_keys(access_key_hash,user_id,last_seen_at)
  values(v_hash,auth.uid(),now())
  on conflict(access_key_hash) do update set user_id=excluded.user_id,last_seen_at=now();
  return true;
end;
$$;
revoke all on function public.loadlink_register_chat_access_key(text) from public;
grant execute on function public.loadlink_register_chat_access_key(text) to authenticated;

create or replace function public.guest_chat_is_pro(p_access_key text)
returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select length(coalesce(p_access_key,''))>=20 and exists(
    select 1
    from public.user_chat_access_keys k
    join public.user_subscriptions s on s.user_id=k.user_id
    where k.access_key_hash=encode(digest(p_access_key,'sha256'),'hex')
      and public.loadlink_account_status(k.user_id) not in ('suspended','blocked')
      and s.status in ('trial','active')
      and s.plan_code in ('pro','dealer')
      and coalesce(s.ends_at,s.current_period_end,s.renews_at,now()+interval '1 day')>now()
  );
$$;
revoke all on function public.guest_chat_is_pro(text) from public;
grant execute on function public.guest_chat_is_pro(text) to anon,authenticated;

create or replace function public.get_daily_message_remaining()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_used integer;
begin
  if auth.uid() is null then return 0; end if;
  if public.loadlink_account_status(auth.uid()) in ('suspended','blocked') then return 0; end if;
  if exists(
    select 1 from public.user_subscriptions s
    where s.user_id=auth.uid() and s.status in ('trial','active') and s.plan_code in ('pro','dealer')
      and coalesce(s.ends_at,s.current_period_end,s.renews_at,now()+interval '1 day')>now()
  ) then return 999999; end if;
  select count(*) into v_used from public.chat_messages where sender_id=auth.uid() and created_at>=date_trunc('day',now());
  return greatest(0,50-v_used);
exception when undefined_table or undefined_column then return 50;
end;
$$;
revoke all on function public.get_daily_message_remaining() from public;
grant execute on function public.get_daily_message_remaining() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Admin identity bootstrap and final permissions
-- ---------------------------------------------------------------------------
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
alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists department text;
alter table public.admin_users add column if not exists is_active boolean not null default true;
alter table public.admin_users add column if not exists last_seen_at timestamptz;
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();
insert into public.admin_users(user_id,email,display_name,role,department,is_active)
select id,lower(email),coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','LoadLink Owner'),'owner','Executive',true
from auth.users where lower(email)=lower('loadlinksouthafrica@gmail.com')
on conflict(user_id) do update set email=excluded.email,role='owner',department='Executive',is_active=true,updated_at=now();

create or replace function public.is_loadlink_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid() and is_active=true);
$$;
revoke all on function public.is_loadlink_admin() from public;
grant execute on function public.is_loadlink_admin() to authenticated;

-- Ensure realtime can publish user-facing decision updates.
do $$ begin
  alter publication supabase_realtime add table public.user_notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.verification_requests;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- End of remaining Phase 1 migration.
