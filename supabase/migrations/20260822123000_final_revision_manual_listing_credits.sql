-- LoadLink final revision: R15 buys one 10-day Manual listing credit.
-- New credits reserve on listing creation and start their 10-day clock only when approved.
-- Legacy day-based access remains readable so existing paid users are not stranded.

create table if not exists public.loadlink_billing_products (
  code text primary key,
  name text not null,
  unit_price_cents bigint not null check (unit_price_cents > 0),
  currency text not null default 'ZAR',
  entitlement_quantity integer not null default 1 check (entitlement_quantity > 0),
  duration_days integer check (duration_days is null or duration_days > 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.loadlink_billing_products(code,name,unit_price_cents,currency,entitlement_quantity,duration_days,is_active)
values ('manual_listing_credit','Manual listing credit',1500,'ZAR',1,10,true)
on conflict (code) do update set
  name=excluded.name,
  unit_price_cents=excluded.unit_price_cents,
  currency=excluded.currency,
  entitlement_quantity=excluded.entitlement_quantity,
  duration_days=excluded.duration_days,
  is_active=excluded.is_active,
  updated_at=now();

create table if not exists public.manual_listing_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.admin_payments(id) on delete restrict,
  payment_reference text not null,
  credit_number integer not null check (credit_number > 0),
  unit_price_cents bigint not null check (unit_price_cents > 0),
  currency text not null default 'ZAR',
  duration_days integer not null default 10 check (duration_days > 0),
  status text not null default 'available' check (status in ('available','reserved','consumed','revoked')),
  listing_id uuid references public.job_listings(id) on delete set null,
  purchased_at timestamptz not null default now(),
  reserved_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_id,credit_number)
);

create index if not exists manual_listing_credits_available_idx
  on public.manual_listing_credits(user_id,purchased_at,id)
  where status='available';
create index if not exists manual_listing_credits_user_status_idx
  on public.manual_listing_credits(user_id,status,purchased_at desc);
create unique index if not exists manual_listing_credits_listing_uidx
  on public.manual_listing_credits(listing_id)
  where listing_id is not null;

alter table public.job_listings add column if not exists manual_credit_id uuid;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='job_listings_manual_credit_id_fkey'
      and conrelid='public.job_listings'::regclass
  ) then
    alter table public.job_listings
      add constraint job_listings_manual_credit_id_fkey
      foreign key (manual_credit_id) references public.manual_listing_credits(id) on delete set null;
  end if;
end $$;
create unique index if not exists job_listings_manual_credit_uidx
  on public.job_listings(manual_credit_id)
  where manual_credit_id is not null;

alter table public.manual_listing_credits enable row level security;
revoke all on public.manual_listing_credits from anon, authenticated;
grant select on public.manual_listing_credits to authenticated;
drop policy if exists manual_listing_credits_owner_read on public.manual_listing_credits;
create policy manual_listing_credits_owner_read on public.manual_listing_credits
  for select to authenticated using (user_id=auth.uid());

alter table public.loadlink_billing_products enable row level security;
revoke all on public.loadlink_billing_products from anon, authenticated;
grant select on public.loadlink_billing_products to anon, authenticated;
drop policy if exists loadlink_billing_products_public_read on public.loadlink_billing_products;
create policy loadlink_billing_products_public_read on public.loadlink_billing_products
  for select to anon, authenticated using (is_active=true);

create or replace function public.loadlink_get_manual_listing_product()
returns jsonb
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  select jsonb_build_object(
    'code',code,
    'name',name,
    'unit_price_cents',unit_price_cents,
    'currency',currency,
    'duration_days',duration_days,
    'max_quantity',100
  )
  from public.loadlink_billing_products
  where code='manual_listing_credit' and is_active=true;
$$;
revoke all on function public.loadlink_get_manual_listing_product() from public;
grant execute on function public.loadlink_get_manual_listing_product() to anon, authenticated, service_role;

create or replace function public.loadlink_get_manual_credit_balance()
returns jsonb
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  select case when auth.uid() is null then
    jsonb_build_object('available',0,'reserved',0,'consumed',0)
  else jsonb_build_object(
    'available',count(*) filter (where status='available'),
    'reserved',count(*) filter (where status='reserved'),
    'consumed',count(*) filter (where status='consumed')
  ) end
  from public.manual_listing_credits
  where user_id=auth.uid();
$$;
revoke all on function public.loadlink_get_manual_credit_balance() from public;
grant execute on function public.loadlink_get_manual_credit_balance() to authenticated;

create or replace function public.loadlink_create_manual_credit_order(p_user_id uuid,p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_product public.loadlink_billing_products%rowtype;
  v_payment public.admin_payments%rowtype;
  v_quantity integer;
  v_amount bigint;
  v_reference text;
begin
  if p_user_id is null then raise exception 'Payment owner is required.'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'LoadLink account not found.'; end if;
  v_quantity:=greatest(1,least(100,coalesce(p_quantity,1)));
  if p_quantity is distinct from v_quantity then raise exception 'Manual listing quantity must be between 1 and 100.'; end if;

  select * into v_product
  from public.loadlink_billing_products
  where code='manual_listing_credit' and is_active=true
  for share;
  if v_product.code is null then raise exception 'Manual listing payments are unavailable.'; end if;
  if upper(v_product.currency)<>'ZAR' then raise exception 'Manual listing currency is not configured for ZAR.'; end if;

  v_amount:=v_product.unit_price_cents::bigint*v_quantity::bigint;
  v_reference:=public.loadlink_generate_payment_reference();

  insert into public.admin_payments(
    user_id,amount_cents,currency,status,provider,reference,external_reference,payment_type,package_type,description,metadata
  ) values (
    p_user_id,v_amount,upper(v_product.currency),'pending','paystack',v_reference,v_reference,
    'manual_listing_credit','manual','LoadLink Manual listing credits',
    jsonb_build_object(
      'source','manual_credit_purchase',
      'product_code',v_product.code,
      'quantity',v_quantity,
      'unit_price_cents',v_product.unit_price_cents,
      'duration_days',v_product.duration_days
    )
  ) returning * into v_payment;

  if to_regclass('public.billing_history') is not null then
    insert into public.billing_history(user_id,payment_id,item_type,item_code,amount_cents,currency,status,reference)
    values(p_user_id,v_payment.id,'manual_listing_credit','manual',v_amount,upper(v_product.currency),'pending',v_reference)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'payment_id',v_payment.id,
    'reference',v_reference,
    'product_code',v_product.code,
    'quantity',v_quantity,
    'unit_price_cents',v_product.unit_price_cents,
    'duration_days',v_product.duration_days,
    'amount_cents',v_amount,
    'currency',upper(v_product.currency),
    'status','pending'
  );
end;
$$;
revoke all on function public.loadlink_create_manual_credit_order(uuid,integer) from public, anon, authenticated;
grant execute on function public.loadlink_create_manual_credit_order(uuid,integer) to service_role;

create or replace function public.loadlink_finalize_manual_credit_payment(
  p_payment_id uuid,
  p_reference text,
  p_provider_transaction_id text,
  p_amount_cents bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_payment public.admin_payments%rowtype;
  v_product public.loadlink_billing_products%rowtype;
  v_quantity integer;
  v_expected bigint;
  v_existing integer;
begin
  select * into v_payment from public.admin_payments where id=p_payment_id for update;
  if v_payment.id is null then raise exception 'LoadLink payment record not found.'; end if;
  if v_payment.reference is distinct from p_reference then raise exception 'Payment reference mismatch.'; end if;
  if v_payment.payment_type is distinct from 'manual_listing_credit' or v_payment.package_type is distinct from 'manual' then
    raise exception 'Invalid Manual listing payment.';
  end if;

  select * into v_product
  from public.loadlink_billing_products
  where code='manual_listing_credit' and is_active=true;
  if v_product.code is null then raise exception 'Manual listing product is unavailable.'; end if;

  begin
    v_quantity:=(v_payment.metadata->>'quantity')::integer;
  exception when others then
    raise exception 'Manual listing quantity is invalid.';
  end;
  if v_quantity<1 or v_quantity>100 then raise exception 'Manual listing quantity is invalid.'; end if;
  v_expected:=v_product.unit_price_cents::bigint*v_quantity::bigint;

  if v_payment.amount_cents<>v_expected or p_amount_cents<>v_expected then
    raise exception 'Payment amount does not match the Manual listing order.';
  end if;
  if upper(coalesce(v_payment.currency,''))<>upper(v_product.currency)
     or upper(coalesce(p_currency,''))<>upper(v_product.currency) then
    raise exception 'Payment currency does not match the Manual listing order.';
  end if;

  select count(*)::int into v_existing
  from public.manual_listing_credits
  where payment_id=v_payment.id;

  if v_payment.status='paid' then
    if v_existing<>v_quantity then raise exception 'Manual credit ledger does not match the paid order.'; end if;
    return jsonb_build_object('ok',true,'already_processed',true,'quantity',v_quantity,'available_credits',v_existing);
  end if;
  if v_payment.status not in ('pending','failed') then raise exception 'This payment cannot be finalized from its current state.'; end if;

  update public.admin_payments
  set status='paid',
      paid_at=coalesce(paid_at,now()),
      settled_at=coalesce(settled_at,now()),
      provider_transaction_id=nullif(p_provider_transaction_id,''),
      reconciliation_status='matched',
      reconciled_at=coalesce(reconciled_at,now()),
      updated_at=now()
  where id=v_payment.id;

  insert into public.manual_listing_credits(
    user_id,payment_id,payment_reference,credit_number,unit_price_cents,currency,duration_days,status,purchased_at
  )
  select v_payment.user_id,v_payment.id,v_payment.reference,n,v_product.unit_price_cents,upper(v_product.currency),v_product.duration_days,'available',now()
  from generate_series(1,v_quantity) as n
  on conflict(payment_id,credit_number) do nothing;

  select count(*)::int into v_existing
  from public.manual_listing_credits
  where payment_id=v_payment.id;
  if v_existing<>v_quantity then raise exception 'Manual credit creation did not match the paid quantity.'; end if;

  if to_regclass('public.billing_history') is not null then
    update public.billing_history set status='paid' where payment_id=v_payment.id;
  end if;

  if not exists(
    select 1 from public.user_notifications
    where user_id=v_payment.user_id
      and type='manual_credits_added'
      and coalesce(metadata->>'reference','')=v_payment.reference
  ) then
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
    values(
      v_payment.user_id,
      'manual_credits_added',
      'Manual listing credits ready',
      v_quantity::text||case when v_quantity=1 then ' Manual listing credit is' else ' Manual listing credits are' end||' ready to use. Each credit activates one listing for 10 days.',
      '/list-your-vehicle',
      'payment',
      v_payment.id,
      jsonb_build_object('reference',v_payment.reference,'quantity',v_quantity,'unit_price_cents',v_product.unit_price_cents,'duration_days',v_product.duration_days)
    );
  end if;

  return jsonb_build_object('ok',true,'already_processed',false,'quantity',v_quantity,'available_credits',v_existing);
end;
$$;
revoke all on function public.loadlink_finalize_manual_credit_payment(uuid,text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.loadlink_finalize_manual_credit_payment(uuid,text,text,bigint,text) to service_role;

create or replace function public.loadlink_get_vehicle_listing_access()
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  s jsonb;
  v_user uuid:=auth.uid();
  v_legacy record;
  v_credit record;
  v_active_manual integer:=0;
  v_available integer:=0;
begin
  s:=public.loadlink_get_my_intelligence_state();
  if coalesce((s->'capabilities'->>'can_post_vehicle')::boolean,false) then
    return jsonb_build_object(
      'allowed',true,
      'plan',case when s->>'plan' in ('pro','dealer') then s->>'plan' else null end,
      'source',case when s->>'plan' in ('pro','dealer') then 'subscription' else null end,
      'subscription_status',s->>'plan_state',
      'expires_at',s->>'current_period_end',
      'access_period_id',null,
      'manual_credit_id',null,
      'manual_credit_balance',0,
      'photo_limit',coalesce((s->'capabilities'->>'image_limit')::int,5),
      'daily_message_limit',null,
      'analytics_enabled',coalesce((s->'capabilities'->>'analytics')::boolean,false),
      'featured_enabled',s->>'plan' in ('pro','dealer'),
      'schema_ready',true
    );
  end if;

  if v_user is null then
    return jsonb_build_object(
      'allowed',false,'plan',null,'source',null,'photo_limit',5,'daily_message_limit',50,
      'analytics_enabled',false,'featured_enabled',false,'manual_credit_balance',0,
      'reason','Sign in to list a vehicle.','schema_ready',true
    );
  end if;

  select count(*)::int into v_active_manual
  from public.job_listings jl
  where jl.user_id=v_user
    and jl.listing_kind='vehicle'
    and jl.package_type='manual'
    and jl.expires_at is not null
    and jl.expires_at>now()
    and coalesce(lower(jl.lifecycle_status),'') not in ('expired','archived')
    and coalesce(lower(jl.status),'') not in ('sold','closed','deleted','archived','expired','rejected');

  select count(*)::int into v_available
  from public.manual_listing_credits
  where user_id=v_user and status='available';

  if v_active_manual>=5 then
    return jsonb_build_object(
      'allowed',false,'plan','manual','source','manual_credit','photo_limit',5,'daily_message_limit',50,
      'analytics_enabled',false,'featured_enabled',false,'active_manual_listings',v_active_manual,
      'manual_listing_limit',5,'manual_credit_balance',v_available,
      'reason','Manual allows up to 5 active vehicle listings at once.','schema_ready',true
    );
  end if;

  select id,duration_days into v_credit
  from public.manual_listing_credits
  where user_id=v_user and status='available'
  order by purchased_at asc,id asc limit 1;

  if v_credit.id is not null then
    return jsonb_build_object(
      'allowed',true,'plan','manual','source','manual_credit','expires_at',null,'access_period_id',null,
      'manual_credit_id',v_credit.id,'manual_credit_balance',v_available,'duration_days',v_credit.duration_days,
      'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false,
      'active_manual_listings',v_active_manual,'manual_listing_limit',5,
      'reason','A paid Manual listing credit is ready to use.','schema_ready',true
    );
  end if;

  select lap.id,lap.expires_at into v_legacy
  from public.listing_access_periods lap
  where lap.user_id=v_user
    and lap.consumed_at is null
    and lap.starts_at<=now()
    and lap.expires_at>now()
  order by lap.expires_at asc,lap.created_at asc limit 1;

  if v_legacy.id is not null then
    return jsonb_build_object(
      'allowed',true,'plan','manual','source','manual_access','expires_at',v_legacy.expires_at,
      'access_period_id',v_legacy.id,'manual_credit_id',null,'manual_credit_balance',v_available,
      'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false,
      'active_manual_listings',v_active_manual,'manual_listing_limit',5,
      'reason','Legacy paid Manual access is ready to use.','schema_ready',true
    );
  end if;

  return jsonb_build_object(
    'allowed',false,'plan',null,'source',null,'photo_limit',5,'daily_message_limit',50,
    'analytics_enabled',false,'featured_enabled',false,'active_manual_listings',v_active_manual,
    'manual_listing_limit',5,'manual_credit_balance',v_available,
    'reason','Choose Manual, Pro or Dealer to list a vehicle.','schema_ready',true
  );
end;
$$;

create or replace function public.loadlink_enforce_listing_access()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_plan text;
  v_period public.listing_access_periods%rowtype;
  v_credit public.manual_listing_credits%rowtype;
  v_limit integer;
  v_count integer;
begin
  if new.user_id is null then new.user_id:=auth.uid(); end if;
  if new.user_id is null then raise exception 'Sign in required'; end if;
  if new.user_id<>auth.uid() and not public.is_loadlink_admin() then raise exception 'Invalid listing owner'; end if;
  if public.loadlink_account_status(new.user_id) in ('suspended','blocked') then raise exception 'Account access is restricted'; end if;

  new.moderation_status:='pending';
  new.moderated_at:=null;
  new.moderated_by:=null;

  if coalesce(new.listing_kind,'job')<>'vehicle' then
    new.package_type:=coalesce(nullif(new.package_type,''),'standard');
    new.payment_status:='not_required';
    return new;
  end if;

  v_plan:=public.loadlink_active_plan(new.user_id);
  if v_plan in ('pro','dealer') then
    new.package_type:=v_plan;
    new.payment_status:='paid';
    new.manual_credit_id:=null;
    new.expires_at:=coalesce(new.expires_at,now()+interval '30 days');
    v_limit:=15;
  else
    select * into v_credit
    from public.manual_listing_credits
    where user_id=new.user_id and status='available'
    order by purchased_at asc,id asc
    limit 1 for update skip locked;

    if v_credit.id is not null then
      update public.manual_listing_credits
      set status='reserved',reserved_at=now(),updated_at=now()
      where id=v_credit.id and status='available';
      if not found then raise exception 'Manual listing credit is no longer available'; end if;

      new.package_type:='manual';
      new.payment_status:='paid';
      new.manual_credit_id:=v_credit.id;
      new.listing_access_period_id:=null;
      new.expires_at:=null;
      v_limit:=5;
    else
      select * into v_period
      from public.listing_access_periods
      where user_id=new.user_id and consumed_at is null and expires_at>now()
      order by expires_at asc
      limit 1 for update skip locked;
      if not found then raise exception 'Vehicle listings require a paid Manual credit, Pro or Dealer access'; end if;

      new.package_type:='manual';
      new.payment_status:='paid';
      new.listing_access_period_id:=v_period.id;
      new.manual_credit_id:=null;
      new.expires_at:=v_period.expires_at;
      v_limit:=5;

      update public.listing_access_periods
      set consumed_at=now(),consumed_listing_id=new.id
      where id=v_period.id and consumed_at is null;
      if not found then raise exception 'Manual listing access is no longer available'; end if;
    end if;
  end if;

  v_count:=coalesce(array_length(new.photos,1),0);
  if v_count>v_limit then raise exception 'This package allows a maximum of % photos',v_limit; end if;
  return new;
end;
$$;

create or replace function public.loadlink_link_reserved_manual_credit()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
begin
  if new.manual_credit_id is not null then
    update public.manual_listing_credits
    set listing_id=new.id,updated_at=now()
    where id=new.manual_credit_id
      and user_id=new.user_id
      and status='reserved'
      and listing_id is null;
    if not found then raise exception 'Reserved Manual listing credit could not be linked to the listing.'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists loadlink_link_reserved_manual_credit_trigger on public.job_listings;
create trigger loadlink_link_reserved_manual_credit_trigger
after insert on public.job_listings
for each row execute function public.loadlink_link_reserved_manual_credit();

create or replace function public.loadlink_activate_manual_credit_on_approval()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_credit public.manual_listing_credits%rowtype;
  v_expiry timestamptz;
begin
  if new.listing_kind<>'vehicle' or new.package_type<>'manual' or new.manual_credit_id is null then return new; end if;
  if new.moderation_status<>'approved' or old.moderation_status='approved' then return new; end if;

  select * into v_credit
  from public.manual_listing_credits
  where id=new.manual_credit_id
  for update;

  if v_credit.id is null
     or v_credit.user_id is distinct from new.user_id
     or v_credit.listing_id is distinct from new.id then
    raise exception 'Manual listing credit does not match this listing.';
  end if;
  if v_credit.status='consumed' then return new; end if;
  if v_credit.status<>'reserved' then raise exception 'Manual listing credit is not reserved for activation.'; end if;

  v_expiry:=now()+make_interval(days=>v_credit.duration_days);
  update public.manual_listing_credits
  set status='consumed',activated_at=now(),consumed_at=now(),expires_at=v_expiry,updated_at=now()
  where id=v_credit.id;

  update public.job_listings
  set expires_at=v_expiry,payment_status='paid'
  where id=new.id and manual_credit_id=v_credit.id;

  return new;
end;
$$;
drop trigger if exists loadlink_activate_manual_credit_trigger on public.job_listings;
create trigger loadlink_activate_manual_credit_trigger
after update of moderation_status on public.job_listings
for each row execute function public.loadlink_activate_manual_credit_on_approval();

create or replace function public.loadlink_release_manual_credit_on_delete()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
begin
  if old.manual_credit_id is not null and coalesce(old.moderation_status,'pending')<>'approved' then
    update public.manual_listing_credits
    set status='available',listing_id=null,reserved_at=null,updated_at=now()
    where id=old.manual_credit_id
      and user_id=old.user_id
      and status='reserved'
      and listing_id=old.id;
  end if;
  return old;
end;
$$;
drop trigger if exists loadlink_release_manual_credit_delete_trigger on public.job_listings;
create trigger loadlink_release_manual_credit_delete_trigger
before delete on public.job_listings
for each row execute function public.loadlink_release_manual_credit_on_delete();
