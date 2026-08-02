-- LoadLink packages, paid vehicle access and dealership profiles
-- Additive migration. It does not delete existing listings, users, chat or authentication data.

create extension if not exists pgcrypto;

-- Package catalogue controlled by the admin dashboard.
create table if not exists public.subscription_plans (
  code text primary key check (code in ('pro','dealer')),
  name text not null,
  price_cents bigint not null check (price_cents >= 0),
  currency text not null default 'ZAR',
  billing_interval text not null default 'month' check (billing_interval in ('month','year')),
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.subscription_plans(code,name,price_cents,currency,billing_interval,benefits)
values
('pro','Pro',39900,'ZAR','month','["Unlimited vehicle listings","15 photos per listing","Unlimited messages","Listing analytics","Higher search visibility","Featured listing credits","Priority support"]'::jsonb),
('dealer','Dealer',299900,'ZAR','month','["Everything in Pro","Public dealership page","Dealer inventory dashboard","Followers and updates","Staff accounts","Lead management","Bulk stock uploads","Featured dealer placement"]'::jsonb)
on conflict (code) do nothing;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null default 'pending' check (status in ('pending','active','past_due','suspended','cancelled','expired')),
  starts_at timestamptz,
  renews_at timestamptz,
  ends_at timestamptz,
  payment_id uuid,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_subscriptions_one_live_plan_idx
  on public.user_subscriptions(user_id)
  where status in ('pending','active','past_due','suspended');
create index if not exists user_subscriptions_user_status_idx on public.user_subscriptions(user_id,status,created_at desc);

create table if not exists public.manual_listing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null,
  days integer not null check (days between 1 and 365),
  daily_price_cents integer not null default 1500 check (daily_price_cents > 0),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists manual_listing_payments_user_idx on public.manual_listing_payments(user_id,created_at desc);

create table if not exists public.listing_access_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manual_payment_id uuid references public.manual_listing_payments(id) on delete set null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_listing_id uuid references public.job_listings(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists listing_access_periods_available_idx on public.listing_access_periods(user_id,expires_at) where consumed_at is null;

-- Shared payment ledger. This matches the corporate control centre table.
create table if not exists public.admin_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.job_listings(id) on delete set null,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','cancelled')),
  provider text not null default 'manual',
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_payments add column if not exists description text;
alter table public.admin_payments add column if not exists metadata jsonb not null default '{}'::jsonb;
create sequence if not exists public.loadlink_payment_reference_seq start with 100001;
create or replace function public.loadlink_generate_payment_reference()
returns text language sql volatile security definer set search_path=public,pg_temp as $$
  select 'LL-PAY-' || to_char(now() at time zone 'UTC','YYYYMMDD') || '-' || lpad(nextval('public.loadlink_payment_reference_seq')::text,6,'0');
$$;

-- Vehicle listing fields used by expiry, plan enforcement and dealer inventory.
alter table public.job_listings add column if not exists listing_kind text not null default 'job';
alter table public.job_listings add column if not exists expires_at timestamptz;
alter table public.job_listings add column if not exists listing_access_period_id uuid references public.listing_access_periods(id) on delete set null;
alter table public.job_listings add column if not exists dealership_id uuid;
alter table public.job_listings add column if not exists stock_status text not null default 'available';
alter table public.job_listings add column if not exists moderation_status text not null default 'pending';
alter table public.job_listings add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Dealership data.
create table if not exists public.dealership_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  profile_image_url text,
  cover_image_url text,
  short_bio text,
  business_description text,
  physical_location text,
  contact_email text,
  phone_number text,
  whatsapp_number text,
  website_url text,
  trading_hours text,
  year_established integer,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected','suspended')),
  verification_reason text,
  average_response_minutes integer,
  trust_score numeric(4,2) not null default 0,
  is_featured boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_listings drop constraint if exists job_listings_dealership_id_fkey;
alter table public.job_listings add constraint job_listings_dealership_id_fkey foreign key (dealership_id) references public.dealership_profiles(id) on delete set null;

create table if not exists public.dealership_followers (
  dealership_id uuid not null references public.dealership_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(dealership_id,user_id)
);

create table if not exists public.dealership_updates (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealership_profiles(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  update_type text not null check (update_type in ('new_stock','new_arrival','price_reduction','weekend_special','finance_offer','clearance','branch_announcement','trading_hours')),
  title text not null,
  body text not null,
  image_url text,
  status text not null default 'approved' check (status in ('pending','approved','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.dealership_staff (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealership_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null check (role in ('owner','manager','salesperson','inventory_manager')),
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(dealership_id,user_id)
);

create table if not exists public.dealership_leads (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealership_profiles(id) on delete cascade,
  listing_id uuid references public.job_listings(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','interested','viewing_arranged','negotiating','finance_pending','sold','closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dealership_promotions (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealership_profiles(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.dealership_verification (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null unique references public.dealership_profiles(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  company_registration_path text,
  tax_document_path text,
  business_address_path text,
  representative_authority_path text,
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_analytics (
  listing_id uuid primary key references public.job_listings(id) on delete cascade,
  views bigint not null default 0,
  unique_viewers bigint not null default 0,
  saves bigint not null default 0,
  shares bigint not null default 0,
  chat_enquiries bigint not null default 0,
  whatsapp_clicks bigint not null default 0,
  phone_clicks bigint not null default 0,
  search_appearances bigint not null default 0,
  updated_at timestamptz not null default now()
);

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

create table if not exists public.daily_message_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  message_count integer not null default 0,
  primary key(user_id,usage_date)
);

-- Private/public storage for dealership branding.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('dealership-assets','dealership-assets',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- RLS
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.manual_listing_payments enable row level security;
alter table public.listing_access_periods enable row level security;
alter table public.dealership_profiles enable row level security;
alter table public.dealership_followers enable row level security;
alter table public.dealership_updates enable row level security;
alter table public.dealership_staff enable row level security;
alter table public.dealership_leads enable row level security;
alter table public.dealership_promotions enable row level security;
alter table public.dealership_verification enable row level security;
alter table public.listing_analytics enable row level security;
alter table public.billing_history enable row level security;
alter table public.daily_message_usage enable row level security;

drop policy if exists "plans public read" on public.subscription_plans;
create policy "plans public read" on public.subscription_plans for select using (is_active=true);

drop policy if exists "subscriptions own read" on public.user_subscriptions;
create policy "subscriptions own read" on public.user_subscriptions for select to authenticated using (user_id=auth.uid());

drop policy if exists "manual payments own read" on public.manual_listing_payments;
create policy "manual payments own read" on public.manual_listing_payments for select to authenticated using (user_id=auth.uid());

drop policy if exists "access periods own read" on public.listing_access_periods;
create policy "access periods own read" on public.listing_access_periods for select to authenticated using (user_id=auth.uid());

drop policy if exists "dealerships public approved read" on public.dealership_profiles;
create policy "dealerships public approved read" on public.dealership_profiles for select using ((verification_status='approved' and is_public=true) or owner_user_id=auth.uid());
drop policy if exists "dealership owner insert" on public.dealership_profiles;
create policy "dealership owner insert" on public.dealership_profiles for insert to authenticated with check (owner_user_id=auth.uid());
drop policy if exists "dealership owner update" on public.dealership_profiles;
create policy "dealership owner update" on public.dealership_profiles for update to authenticated using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());

drop policy if exists "followers public counts" on public.dealership_followers;
create policy "followers public counts" on public.dealership_followers for select using (true);
drop policy if exists "followers own insert" on public.dealership_followers;
create policy "followers own insert" on public.dealership_followers for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "followers own delete" on public.dealership_followers;
create policy "followers own delete" on public.dealership_followers for delete to authenticated using (user_id=auth.uid());

drop policy if exists "updates public approved read" on public.dealership_updates;
create policy "updates public approved read" on public.dealership_updates for select using (status='approved' or author_user_id=auth.uid());
drop policy if exists "updates dealer insert" on public.dealership_updates;
create policy "updates dealer insert" on public.dealership_updates for insert to authenticated with check (
 author_user_id=auth.uid() and exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_updates.dealership_id and s.user_id=auth.uid() and s.is_active)
);
drop policy if exists "updates dealer update" on public.dealership_updates;
create policy "updates dealer update" on public.dealership_updates for update to authenticated using (
 author_user_id=auth.uid() or exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_updates.dealership_id and s.user_id=auth.uid() and s.role in ('owner','manager') and s.is_active)
);

drop policy if exists "staff dealership read" on public.dealership_staff;
create policy "staff dealership read" on public.dealership_staff for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.dealership_profiles p where p.id=dealership_staff.dealership_id and p.owner_user_id=auth.uid())
);
drop policy if exists "staff owner manage" on public.dealership_staff;
create policy "staff owner manage" on public.dealership_staff for all to authenticated using (
 exists(select 1 from public.dealership_profiles p where p.id=dealership_staff.dealership_id and p.owner_user_id=auth.uid())
) with check (
 exists(select 1 from public.dealership_profiles p where p.id=dealership_staff.dealership_id and p.owner_user_id=auth.uid())
);

drop policy if exists "leads dealer read" on public.dealership_leads;
create policy "leads dealer read" on public.dealership_leads for select to authenticated using (
 customer_user_id=auth.uid() or exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_leads.dealership_id and s.user_id=auth.uid() and s.is_active)
);
drop policy if exists "leads customer insert" on public.dealership_leads;
create policy "leads customer insert" on public.dealership_leads for insert to authenticated with check (customer_user_id=auth.uid());
drop policy if exists "leads dealer update" on public.dealership_leads;
create policy "leads dealer update" on public.dealership_leads for update to authenticated using (
 exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_leads.dealership_id and s.user_id=auth.uid() and s.is_active)
);

drop policy if exists "promotions public active read" on public.dealership_promotions;
create policy "promotions public active read" on public.dealership_promotions for select using (is_active=true or exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_promotions.dealership_id and s.user_id=auth.uid() and s.is_active));
drop policy if exists "promotions manager manage" on public.dealership_promotions;
create policy "promotions manager manage" on public.dealership_promotions for all to authenticated using (exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_promotions.dealership_id and s.user_id=auth.uid() and s.role in ('owner','manager') and s.is_active)) with check (exists(select 1 from public.dealership_staff s where s.dealership_id=dealership_promotions.dealership_id and s.user_id=auth.uid() and s.role in ('owner','manager') and s.is_active));

drop policy if exists "verification applicant read" on public.dealership_verification;
create policy "verification applicant read" on public.dealership_verification for select to authenticated using (applicant_user_id=auth.uid());
drop policy if exists "verification applicant insert" on public.dealership_verification;
create policy "verification applicant insert" on public.dealership_verification for insert to authenticated with check (applicant_user_id=auth.uid());

drop policy if exists "analytics pro owner read" on public.listing_analytics;
create policy "analytics pro owner read" on public.listing_analytics for select to authenticated using (
 exists(select 1 from public.job_listings l where l.id=listing_analytics.listing_id and l.user_id=auth.uid())
 and exists(select 1 from public.user_subscriptions s where s.user_id=auth.uid() and s.status='active' and s.plan_code in ('pro','dealer') and coalesce(s.ends_at,s.renews_at,now()+interval '1 day')>now())
);

drop policy if exists "billing own read" on public.billing_history;
create policy "billing own read" on public.billing_history for select to authenticated using (user_id=auth.uid());
drop policy if exists "message usage own read" on public.daily_message_usage;
create policy "message usage own read" on public.daily_message_usage for select to authenticated using (user_id=auth.uid());

drop policy if exists "dealership assets public read" on storage.objects;
create policy "dealership assets public read" on storage.objects for select using (bucket_id='dealership-assets');
drop policy if exists "dealership assets owner insert" on storage.objects;
create policy "dealership assets owner insert" on storage.objects for insert to authenticated with check (bucket_id='dealership-assets' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "dealership assets owner update" on storage.objects;
create policy "dealership assets owner update" on storage.objects for update to authenticated using (bucket_id='dealership-assets' and owner_id=auth.uid()::text);
drop policy if exists "dealership assets owner delete" on storage.objects;
create policy "dealership assets owner delete" on storage.objects for delete to authenticated using (bucket_id='dealership-assets' and owner_id=auth.uid()::text);

-- Package access returned to the vehicle listing page.
create or replace function public.loadlink_get_vehicle_listing_access()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare sub record; access_row record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into sub from public.user_subscriptions
   where user_id=auth.uid() and status='active' and coalesce(ends_at,renews_at,now()+interval '1 day')>now()
   order by case when plan_code='dealer' then 0 else 1 end, created_at desc limit 1;
  if found then
    return jsonb_build_object('allowed',true,'plan',sub.plan_code,'source','subscription','subscription_status',sub.status,'expires_at',coalesce(sub.ends_at,sub.renews_at),'photo_limit',15,'daily_message_limit',null,'analytics_enabled',true,'featured_enabled',true);
  end if;
  select * into access_row from public.listing_access_periods
   where user_id=auth.uid() and consumed_at is null and expires_at>now()
   order by created_at asc limit 1;
  if found then
    return jsonb_build_object('allowed',true,'plan','manual','source','manual_access','access_period_id',access_row.id,'expires_at',access_row.expires_at,'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false);
  end if;
  return jsonb_build_object('allowed',false,'plan',null,'source',null,'photo_limit',0,'daily_message_limit',0,'analytics_enabled',false,'featured_enabled',false);
end $$;
grant execute on function public.loadlink_get_vehicle_listing_access() to authenticated;

create or replace function public.loadlink_request_manual_listing_payment(p_days integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare payment_row public.admin_payments; manual_row public.manual_listing_payments; safe_days integer; ref text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 safe_days:=greatest(1,least(365,p_days)); ref:=public.loadlink_generate_payment_reference();
 insert into public.admin_payments(user_id,amount_cents,currency,status,provider,reference,description,metadata)
 values(auth.uid(),safe_days*1500,'ZAR','pending','manual',ref,'Manual vehicle listing access',jsonb_build_object('type','manual_listing','days',safe_days)) returning * into payment_row;
 insert into public.manual_listing_payments(user_id,payment_id,days,daily_price_cents,amount_cents,status)
 values(auth.uid(),payment_row.id,safe_days,1500,safe_days*1500,'pending') returning * into manual_row;
 insert into public.billing_history(user_id,payment_id,item_type,item_code,amount_cents,status,reference)
 values(auth.uid(),payment_row.id,'manual_listing','manual',safe_days*1500,'pending',ref);
 return jsonb_build_object('payment_id',payment_row.id,'reference',ref,'days',safe_days,'amount_cents',safe_days*1500,'status','pending');
end $$;
grant execute on function public.loadlink_request_manual_listing_payment(integer) to authenticated;

create or replace function public.loadlink_request_subscription(p_plan_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare plan_row public.subscription_plans; payment_row public.admin_payments; ref text; sub_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_plan_code not in ('pro','dealer') then raise exception 'Invalid package'; end if;
 select * into plan_row from public.subscription_plans where code=p_plan_code and is_active=true;
 if not found then raise exception 'Package unavailable'; end if;
 ref:=public.loadlink_generate_payment_reference();
 insert into public.admin_payments(user_id,amount_cents,currency,status,provider,reference,description,metadata)
 values(auth.uid(),plan_row.price_cents,plan_row.currency,'pending','manual',ref,plan_row.name||' subscription',jsonb_build_object('type','subscription','plan_code',p_plan_code)) returning * into payment_row;
 delete from public.user_subscriptions where user_id=auth.uid() and status='pending';
 insert into public.user_subscriptions(user_id,plan_code,status,payment_id)
 values(auth.uid(),p_plan_code,'pending',payment_row.id) returning id into sub_id;
 insert into public.billing_history(user_id,payment_id,item_type,item_code,amount_cents,status,reference)
 values(auth.uid(),payment_row.id,'subscription',p_plan_code,plan_row.price_cents,'pending',ref);
 return jsonb_build_object('payment_id',payment_row.id,'reference',ref,'plan',p_plan_code,'amount_cents',plan_row.price_cents,'status','pending');
end $$;
grant execute on function public.loadlink_request_subscription(text) to authenticated;

-- When the admin marks a payment paid, unlock the correct access automatically.
create or replace function public.loadlink_apply_paid_package()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare manual_row public.manual_listing_payments; plan_code text;
begin
 if new.status='paid' and old.status is distinct from 'paid' then
   select * into manual_row from public.manual_listing_payments where payment_id=new.id;
   if found then
     update public.manual_listing_payments set status='paid',paid_at=now() where id=manual_row.id;
     insert into public.listing_access_periods(user_id,manual_payment_id,starts_at,expires_at)
     values(manual_row.user_id,manual_row.id,now(),now()+make_interval(days=>manual_row.days));
   else
     plan_code:=new.metadata->>'plan_code';
     if plan_code in ('pro','dealer') then
       update public.user_subscriptions set status='active',starts_at=coalesce(starts_at,now()),renews_at=now()+interval '1 month',ends_at=now()+interval '1 month',updated_at=now() where payment_id=new.id;
     end if;
   end if;
   update public.billing_history set status='paid' where payment_id=new.id;
 end if;
 return new;
end $$;
drop trigger if exists loadlink_apply_paid_package_trigger on public.admin_payments;
create trigger loadlink_apply_paid_package_trigger after update of status on public.admin_payments for each row execute function public.loadlink_apply_paid_package();

-- Consume one manual access period and stamp listing expiry. Pro/Dealer access is not consumed.
create or replace function public.loadlink_attach_vehicle_access(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare access jsonb; access_id uuid; expiry timestamptz; plan_code text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.job_listings where id=p_listing_id and user_id=auth.uid()) then raise exception 'Listing not owned by user'; end if;
 access:=public.loadlink_get_vehicle_listing_access();
 if coalesce((access->>'allowed')::boolean,false)=false then raise exception 'Paid vehicle listing access required'; end if;
 plan_code:=access->>'plan';
 if plan_code='manual' then
   access_id:=(access->>'access_period_id')::uuid; expiry:=(access->>'expires_at')::timestamptz;
   update public.listing_access_periods set consumed_at=now(),consumed_listing_id=p_listing_id where id=access_id and user_id=auth.uid() and consumed_at is null;
   if not found then raise exception 'Manual listing access is no longer available'; end if;
   update public.job_listings set listing_kind='vehicle',package_type='manual',listing_access_period_id=access_id,expires_at=expiry,sponsored=false where id=p_listing_id;
 else
   update public.job_listings set listing_kind='vehicle',package_type=plan_code,expires_at=null,sponsored=true where id=p_listing_id;
 end if;
 return jsonb_build_object('plan',plan_code,'expires_at',expiry);
end $$;
grant execute on function public.loadlink_attach_vehicle_access(uuid) to authenticated;

-- Public dealership profile summary with follower count.
create or replace view public.public_dealership_profiles as
select p.*, (select count(*) from public.dealership_followers f where f.dealership_id=p.id) as follower_count,
       (select count(*) from public.job_listings l where l.dealership_id=p.id and l.stock_status='available' and (l.expires_at is null or l.expires_at>now())) as active_listing_count
from public.dealership_profiles p where p.verification_status='approved' and p.is_public=true;
grant select on public.public_dealership_profiles to anon,authenticated;

-- Notify followers when an approved dealership update is published.
create or replace function public.loadlink_notify_dealership_followers()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status='approved' then
   insert into public.user_notifications(user_id,type,title,message,action_url,metadata)
   select f.user_id,'dealership_update',p.name||' posted an update',new.title,'/dealership/'||p.slug,jsonb_build_object('dealership_id',p.id,'update_id',new.id)
   from public.dealership_followers f join public.dealership_profiles p on p.id=f.dealership_id
   where f.dealership_id=new.dealership_id;
 end if;
 return new;
exception when undefined_table then return new;
end $$;
drop trigger if exists loadlink_notify_dealership_followers_trigger on public.dealership_updates;
create trigger loadlink_notify_dealership_followers_trigger after insert on public.dealership_updates for each row execute function public.loadlink_notify_dealership_followers();

-- Grants used by browser clients. Writes remain controlled by policies and RPCs.
grant select on public.subscription_plans,public.user_subscriptions,public.manual_listing_payments,public.listing_access_periods,public.dealership_profiles,public.dealership_followers,public.dealership_updates,public.dealership_staff,public.dealership_leads,public.dealership_promotions,public.dealership_verification,public.listing_analytics,public.billing_history,public.daily_message_usage to authenticated;
grant select on public.dealership_profiles,public.dealership_followers,public.dealership_updates,public.dealership_promotions to anon;
grant insert,delete on public.dealership_followers to authenticated;
grant insert,update on public.dealership_profiles,public.dealership_updates,public.dealership_staff,public.dealership_leads,public.dealership_promotions,public.dealership_verification to authenticated;

-- Dealership reports submitted from public profiles.
create table if not exists public.dealership_reports (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealership_profiles(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.dealership_reports enable row level security;
drop policy if exists "dealership reports own insert" on public.dealership_reports;
create policy "dealership reports own insert" on public.dealership_reports for insert to authenticated with check (reporter_user_id=auth.uid());
drop policy if exists "dealership reports own read" on public.dealership_reports;
create policy "dealership reports own read" on public.dealership_reports for select to authenticated using (reporter_user_id=auth.uid());
grant select,insert on public.dealership_reports to authenticated;

-- Private dealership verification documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('dealership-documents','dealership-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];
drop policy if exists "dealership documents owner insert" on storage.objects;
create policy "dealership documents owner insert" on storage.objects for insert to authenticated with check (bucket_id='dealership-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "dealership documents owner read" on storage.objects;
create policy "dealership documents owner read" on storage.objects for select to authenticated using (bucket_id='dealership-documents' and owner_id=auth.uid()::text);

-- Link private chat access keys to the signed-in account so Pro and Dealer users
-- receive unlimited messaging without exposing the keys themselves.
create table if not exists public.user_chat_access_keys (
  access_key_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.user_chat_access_keys enable row level security;
revoke all on public.user_chat_access_keys from anon,authenticated;

create or replace function public.loadlink_register_chat_access_key(p_access_key text)
returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare key_hash text;
begin
 if auth.uid() is null or length(coalesce(p_access_key,''))<20 then return false; end if;
 key_hash:=encode(digest(p_access_key,'sha256'),'hex');
 insert into public.user_chat_access_keys(access_key_hash,user_id,last_seen_at)
 values(key_hash,auth.uid(),now())
 on conflict(access_key_hash) do update set user_id=excluded.user_id,last_seen_at=now();
 return true;
end $$;
grant execute on function public.loadlink_register_chat_access_key(text) to authenticated;

create or replace function public.guest_chat_is_pro(p_access_key text)
returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select length(coalesce(p_access_key,''))>=20 and (
    exists(select 1 from public.guest_chat_plans p where p.access_key_hash=encode(digest(p_access_key,'sha256'),'hex') and p.plan in ('pro','dealer') and (p.expires_at is null or p.expires_at>now()))
    or exists(select 1 from public.job_listings j where j.owner_key=p_access_key and lower(coalesce(j.package_type,'manual')) in ('pro','dealer'))
    or exists(
      select 1 from public.user_chat_access_keys k
      join public.user_subscriptions s on s.user_id=k.user_id
      where k.access_key_hash=encode(digest(p_access_key,'sha256'),'hex')
        and s.status='active' and s.plan_code in ('pro','dealer')
        and coalesce(s.ends_at,s.renews_at,now()+interval '1 day')>now()
    )
  );
$$;
revoke all on function public.guest_chat_is_pro(text) from public;
grant execute on function public.guest_chat_is_pro(text) to anon,authenticated;

create or replace function public.get_daily_message_remaining()
returns integer language plpgsql security definer set search_path=public as $$
declare v_used integer;
begin
 if auth.uid() is null then return 0; end if;
 if exists(select 1 from public.user_subscriptions s where s.user_id=auth.uid() and s.status='active' and s.plan_code in ('pro','dealer') and coalesce(s.ends_at,s.renews_at,now()+interval '1 day')>now()) then return 999999; end if;
 select count(*) into v_used from public.chat_messages where sender_id=auth.uid() and created_at>=date_trunc('day',now());
 return greatest(0,50-v_used);
exception when undefined_table then return 50;
end $$;

-- Listing renewal and public expiry enforcement.
alter table public.manual_listing_payments add column if not exists listing_id uuid references public.job_listings(id) on delete set null;

drop policy if exists "loadlink_jobs_read_all" on public.job_listings;
drop policy if exists "loadlink_jobs_read_active_or_own" on public.job_listings;
create policy "loadlink_jobs_read_active_or_own" on public.job_listings for select using (
  expires_at is null or expires_at > now() or user_id = auth.uid()
);

create or replace function public.loadlink_request_listing_renewal(p_listing_id uuid,p_days integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare payment_row public.admin_payments; manual_row public.manual_listing_payments; safe_days integer; ref text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.job_listings where id=p_listing_id and user_id=auth.uid() and listing_kind='vehicle') then raise exception 'Vehicle listing not found'; end if;
 safe_days:=greatest(1,least(365,p_days)); ref:=public.loadlink_generate_payment_reference();
 insert into public.admin_payments(user_id,listing_id,amount_cents,currency,status,provider,reference,description,metadata)
 values(auth.uid(),p_listing_id,safe_days*1500,'ZAR','pending','manual',ref,'Manual vehicle listing renewal',jsonb_build_object('type','listing_renewal','days',safe_days,'listing_id',p_listing_id)) returning * into payment_row;
 insert into public.manual_listing_payments(user_id,payment_id,listing_id,days,daily_price_cents,amount_cents,status)
 values(auth.uid(),payment_row.id,p_listing_id,safe_days,1500,safe_days*1500,'pending') returning * into manual_row;
 insert into public.billing_history(user_id,payment_id,item_type,item_code,amount_cents,status,reference)
 values(auth.uid(),payment_row.id,'listing_renewal',p_listing_id::text,safe_days*1500,'pending',ref);
 return jsonb_build_object('payment_id',payment_row.id,'reference',ref,'listing_id',p_listing_id,'days',safe_days,'amount_cents',safe_days*1500,'status','pending');
end $$;
grant execute on function public.loadlink_request_listing_renewal(uuid,integer) to authenticated;

create or replace function public.loadlink_apply_paid_package()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare manual_row public.manual_listing_payments; plan_code text; payment_type text; renewal_days integer; renewal_listing uuid;
begin
 if new.status='paid' and old.status is distinct from 'paid' then
   payment_type:=new.metadata->>'type';
   if payment_type='listing_renewal' then
     renewal_days:=greatest(1,least(365,coalesce((new.metadata->>'days')::integer,1)));
     renewal_listing:=coalesce(new.listing_id,(new.metadata->>'listing_id')::uuid);
     update public.manual_listing_payments set status='paid',paid_at=now() where payment_id=new.id;
     update public.job_listings set expires_at=greatest(coalesce(expires_at,now()),now())+make_interval(days=>renewal_days),status='active' where id=renewal_listing and user_id=new.user_id;
   else
     select * into manual_row from public.manual_listing_payments where payment_id=new.id;
     if found then
       update public.manual_listing_payments set status='paid',paid_at=now() where id=manual_row.id;
       insert into public.listing_access_periods(user_id,manual_payment_id,starts_at,expires_at)
       values(manual_row.user_id,manual_row.id,now(),now()+make_interval(days=>manual_row.days));
     else
       plan_code:=new.metadata->>'plan_code';
       if plan_code in ('pro','dealer') then
         update public.user_subscriptions set status='active',starts_at=coalesce(starts_at,now()),renews_at=now()+interval '1 month',ends_at=now()+interval '1 month',updated_at=now() where payment_id=new.id;
       end if;
     end if;
   end if;
   update public.billing_history set status='paid' where payment_id=new.id;
 end if;
 return new;
end $$;
drop trigger if exists loadlink_apply_paid_package_trigger on public.admin_payments;
create trigger loadlink_apply_paid_package_trigger after update of status on public.admin_payments for each row execute function public.loadlink_apply_paid_package();

-- Follower privacy: expose counts and the current user's follow state, not follower identities.
revoke select on public.dealership_followers from anon;
drop policy if exists "followers public counts" on public.dealership_followers;
drop policy if exists "followers own read" on public.dealership_followers;
create policy "followers own read" on public.dealership_followers for select to authenticated using (user_id=auth.uid());

create or replace function public.loadlink_dealership_social_status(p_dealership_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'follower_count',(select count(*) from public.dealership_followers f where f.dealership_id=p_dealership_id),
    'is_following',case when auth.uid() is null then false else exists(select 1 from public.dealership_followers f where f.dealership_id=p_dealership_id and f.user_id=auth.uid()) end
  );
$$;
grant execute on function public.loadlink_dealership_social_status(uuid) to anon,authenticated;
