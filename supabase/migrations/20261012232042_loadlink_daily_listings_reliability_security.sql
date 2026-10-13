-- LoadLink: daily prepaid listing visibility, owner attention, security containment.
-- Existing purchased ten-day credits and payment snapshots remain valid.
create schema if not exists loadlink_private;
revoke all on schema loadlink_private from public, anon, authenticated;
alter table public.job_listings add column if not exists daily_billing_enabled boolean not null default false;
alter table public.job_listings add column if not exists paused_listing_seconds bigint;
create or replace function loadlink_private.canonical_listing_kind()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if lower(coalesce(new.listing_kind,'')) in ('asset','truck_sale','vehicle_listing','mobile_unit') then
    new.listing_kind:='vehicle';
  end if;
  return new;
end;
$$;
revoke all on function loadlink_private.canonical_listing_kind() from public,anon,authenticated;
drop trigger if exists loadlink_01_canonical_listing_kind on public.job_listings;
create trigger loadlink_01_canonical_listing_kind before insert or update of description,listing_kind on public.job_listings
for each row execute function loadlink_private.canonical_listing_kind();
update public.loadlink_billing_products set name='Daily vehicle listing credit',duration_days=1,updated_at=now()
where code='manual_listing_credit';

CREATE OR REPLACE FUNCTION public.loadlink_enforce_listing_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_limit integer := 5;
  v_photo_count integer := 0;
  v_plan text := 'standard';
  v_content_changed boolean := false;
  v_resubmission boolean := coalesce(current_setting('loadlink.resubmission', true),'')='on';
begin
  if public.loadlink_is_staff(array['moderator','operations','admin','owner']) then return new; end if;
  if auth.uid() is null then
    if session_user in ('postgres','supabase_admin') then return new; end if;
    raise exception 'Authentication required';
  end if;
  if tg_op='UPDATE' and old.user_id is distinct from auth.uid() then raise exception 'Only the listing owner can update this listing'; end if;

  new.user_id:=auth.uid();
  new.listing_kind:=case when lower(coalesce(new.listing_kind,'job'))='asset' then 'vehicle' else lower(coalesce(new.listing_kind,'job')) end;
  if new.listing_kind not in ('job','contract','vehicle') then raise exception 'Invalid listing type'; end if;
  if tg_op='UPDATE' and new.listing_kind is distinct from (case when old.listing_kind='asset' then 'vehicle' else old.listing_kind end) then raise exception 'A listing type cannot be changed after creation'; end if;

  if new.listing_kind in ('job','contract') then
    v_plan:='standard'; new.package_type:='standard'; new.expires_at:=coalesce(new.expires_at,now()+interval '30 days');
  elsif tg_op='INSERT' then
    v_plan:=lower(coalesce(new.package_type,''));
    if v_plan not in ('manual','pro','dealer') then raise exception 'Paid vehicle listing access is required'; end if;
    if v_plan='manual' and new.listing_access_period_id is null and new.manual_credit_id is null then raise exception 'Manual listing access is no longer available'; end if;
  else
    v_plan:=lower(coalesce(old.package_type,new.package_type,'standard'));
    new.package_type:=old.package_type;
    new.listing_access_period_id:=old.listing_access_period_id;
    new.expires_at:=old.expires_at;
    new.payment_status:=old.payment_status;
    new.daily_billing_enabled:=old.daily_billing_enabled;
    new.paused_listing_seconds:=old.paused_listing_seconds;
    new.manual_credit_id:=old.manual_credit_id;
    new.boost_expires_at:=old.boost_expires_at;
    new.payment_reference:=old.payment_reference;
  end if;

  select listing_image_limit into v_limit from public.marketplace_plan_rules where plan_code=v_plan;
  v_limit:=coalesce(v_limit,5);
  v_photo_count:=coalesce(array_length(new.photos,1),0);
  if v_photo_count>v_limit then raise exception 'This package allows a maximum of % listing images',v_limit; end if;

  if tg_op='INSERT' then
    new.sponsored:=false; new.sponsor_label:=null; new.sponsored_until:=null; new.featured_until:=null; new.display_tier:=1;
    new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
    new.daily_billing_enabled:=false; new.paused_listing_seconds:=null;
    new.lifecycle_status:='draft'; new.status:='active'; new.approved_at:=null; new.rejection_reason:=null;
  else
    v_content_changed:=new.title is distinct from old.title or new.city is distinct from old.city or new.vehicle_group is distinct from old.vehicle_group or
      new.rate is distinct from old.rate or new.contact_number is distinct from old.contact_number or new.whatsapp_number is distinct from old.whatsapp_number or
      new.description is distinct from old.description or new.photos is distinct from old.photos;

    new.sponsored:=old.sponsored; new.sponsor_label:=old.sponsor_label; new.sponsored_until:=old.sponsored_until; new.featured_until:=old.featured_until; new.display_tier:=old.display_tier;

    if v_content_changed or v_resubmission then
      new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
      new.approved_at:=null; new.rejection_reason:=null; new.lifecycle_status:='draft';
      if new.status not in ('active','filled','closed','draft') then new.status:='active'; end if;
    else
      new.moderation_status:=old.moderation_status; new.moderation_notes:=old.moderation_notes; new.moderated_at:=old.moderated_at; new.moderated_by:=old.moderated_by;
      new.approved_at:=old.approved_at; new.rejection_reason:=old.rejection_reason;
      if new.lifecycle_status not in ('draft','live','paused','expired','archived') then new.lifecycle_status:=old.lifecycle_status; end if;
      if new.status not in ('active','filled','closed','draft') then new.status:=old.status; end if;
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.loadlink_activate_manual_credit_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_credit public.manual_listing_credits%rowtype;
  v_expiry timestamptz;
begin
  if new.listing_kind<>'vehicle' or new.package_type<>'manual' or new.manual_credit_id is null then return new; end if;
  if new.moderation_status<>'approved' or old.moderation_status='approved' then return new; end if;

  select * into v_credit from public.manual_listing_credits where id=new.manual_credit_id for update;
  if v_credit.id is null or v_credit.user_id is distinct from new.user_id or v_credit.listing_id is distinct from new.id then
    raise exception 'Manual listing credit does not match this listing.';
  end if;
  if v_credit.status='consumed' then return new; end if;
  if v_credit.status<>'reserved' then raise exception 'Manual listing credit is not reserved for activation.'; end if;

  v_expiry:=now()+make_interval(days=>v_credit.duration_days);
  update public.manual_listing_credits
    set status='consumed',activated_at=now(),consumed_at=now(),expires_at=v_expiry,updated_at=now()
    where id=v_credit.id;
  update public.job_listings
    set expires_at=v_expiry,payment_status='paid',daily_billing_enabled=(v_credit.duration_days=1)
    where id=new.id and manual_credit_id=v_credit.id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.loadlink_grant_manual_credit_after_review(p_payment_id uuid, p_reference text, p_provider_transaction_id text, p_amount_cents bigint, p_currency text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_payment public.admin_payments%rowtype;
  v_product public.loadlink_billing_products%rowtype;
  v_quantity integer;
  v_expected bigint;
  v_existing integer;
  v_duration integer;
begin
  select * into v_payment from public.admin_payments where id=p_payment_id for update;
  if v_payment.id is null then raise exception 'LoadLink payment record not found.'; end if;
  if v_payment.reference is distinct from p_reference then raise exception 'Payment reference mismatch.'; end if;
  if v_payment.payment_type is distinct from 'manual_listing_credit' or v_payment.package_type is distinct from 'manual' then
    raise exception 'Invalid Manual listing payment.';
  end if;

  select * into v_product from public.loadlink_billing_products
  where code='manual_listing_credit' and is_active=true;
  if v_product.code is null then raise exception 'Manual listing product is unavailable.'; end if;

  begin
    v_quantity:=(v_payment.metadata->>'quantity')::integer;
  exception when others then
    raise exception 'Manual listing quantity is invalid.';
  end;
  if v_quantity<1 or v_quantity>100 then raise exception 'Manual listing quantity is invalid.'; end if;
  v_duration:=coalesce((v_payment.metadata->>'duration_days')::integer,10);
  if v_duration not in (1,10) or coalesce((v_payment.metadata->>'unit_price_cents')::bigint,1500)<>1500 then raise exception 'Invalid credit order snapshot.'; end if;
  v_expected:=1500::bigint*v_quantity::bigint;

  if v_payment.amount_cents<>v_expected or p_amount_cents<>v_expected then
    raise exception 'Payment amount does not match the Manual listing order.';
  end if;
  if upper(coalesce(v_payment.currency,''))<>upper(v_product.currency)
     or upper(coalesce(p_currency,''))<>upper(v_product.currency) then
    raise exception 'Payment currency does not match the Manual listing order.';
  end if;

  select count(*)::int into v_existing from public.manual_listing_credits where payment_id=v_payment.id;
  if v_payment.status='paid' then
    if v_existing<>v_quantity then raise exception 'Manual credit ledger does not match the paid order.'; end if;
    return jsonb_build_object('ok',true,'already_processed',true,'quantity',v_quantity,'available_credits',v_existing);
  end if;
  if v_payment.status not in ('pending','failed') then raise exception 'This payment cannot be finalized from its current state.'; end if;

  update public.admin_payments
    set status='paid',paid_at=coalesce(paid_at,now()),settled_at=coalesce(settled_at,now()),
        provider_transaction_id=nullif(p_provider_transaction_id,''),reconciliation_status='matched',reconciled_at=coalesce(reconciled_at,now()),updated_at=now()
    where id=v_payment.id;

  insert into public.manual_listing_credits(
    user_id,payment_id,payment_reference,credit_number,unit_price_cents,currency,duration_days,status,purchased_at
  )
  select v_payment.user_id,v_payment.id,v_payment.reference,n,v_product.unit_price_cents,upper(v_product.currency),v_duration,'available',now()
  from generate_series(1,v_quantity) as n
  on conflict(payment_id,credit_number) do nothing;

  select count(*)::int into v_existing from public.manual_listing_credits where payment_id=v_payment.id;
  if v_existing<>v_quantity then raise exception 'Manual credit creation did not match the paid quantity.'; end if;

  if to_regclass('public.billing_history') is not null then
    update public.billing_history set status='paid' where payment_id=v_payment.id;
  end if;

  if not exists(
    select 1 from public.user_notifications
    where user_id=v_payment.user_id and type='manual_credits_added' and coalesce(metadata->>'reference','')=v_payment.reference
  ) then
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
    values(
      v_payment.user_id,'manual_credits_added','Manual listing credits ready',
      v_quantity::text||case when v_quantity=1 then ' Manual listing credit is' else ' Manual listing credits are' end||' ready to use. Each credit pays for '||v_duration::text||case when v_duration=1 then ' active day.' else ' days on the original order.' end,
      '/list-your-vehicle','payment',v_payment.id,
      jsonb_build_object('reference',v_payment.reference,'quantity',v_quantity,'unit_price_cents',v_product.unit_price_cents,'duration_days',v_duration)
    );
  end if;

  return jsonb_build_object('ok',true,'already_processed',false,'quantity',v_quantity,'available_credits',v_existing);
end;
$function$;


-- Replacing the return type is safe: current dependency inspection found no dependent objects.
drop function public.get_public_job_listings();
create function public.get_public_job_listings()
returns table (id uuid,
title text,
city text,
vehicle_group text,
rate text,
posted_by text,
contact_number text,
description text,
photos text[],
sponsored boolean,
package_type text,
created_at timestamp with time zone,
view_count integer,
last_viewed_at timestamp with time zone,
whatsapp_number text,
poster_photo text,
user_id uuid,
status text,
moderation_status text,
listing_kind text,
expires_at timestamp with time zone,
dealership_id uuid,
stock_status text,
display_tier integer,
boost_expires_at timestamp with time zone,
featured_until timestamp with time zone,
province text,
price_amount numeric(14,2),
price_type text,
vehicle_type text,
vehicle_year integer,
brand text,
model text,
body_type text,
transmission text,
fuel_type text,
axle_configuration text,
odometer_km integer,
gvm_kg integer,
payload_kg integer,
condition text,
service_history text,
previous_owners integer,
video_url text,
verification_level text,
route_start text,
route_end text,
route_distance_km numeric(10,2),
load_type text,
required_equipment text[],
rate_amount numeric(14,2),
rate_unit text,
payment_terms text,
recurrence_type text,
recurrence_until date,
work_starts_at timestamp with time zone,
work_ends_at timestamp with time zone)
language sql stable security definer set search_path=public,pg_temp
as $$
select j.id,j.title,j.city,j.vehicle_group,j.rate,j.posted_by,j.contact_number,j.description,j.photos,j.sponsored,j.package_type,j.created_at,j.view_count,j.last_viewed_at,j.whatsapp_number,j.poster_photo,j.user_id,j.status,j.moderation_status,j.listing_kind,j.expires_at,j.dealership_id,j.stock_status,j.display_tier,j.boost_expires_at,j.featured_until,j.province,j.price_amount,j.price_type,j.vehicle_type,j.vehicle_year,j.brand,j.model,j.body_type,j.transmission,j.fuel_type,j.axle_configuration,j.odometer_km,j.gvm_kg,j.payload_kg,j.condition,j.service_history,j.previous_owners,j.video_url,j.verification_level,j.route_start,j.route_end,j.route_distance_km,j.load_type,j.required_equipment,j.rate_amount,j.rate_unit,j.payment_terms,j.recurrence_type,j.recurrence_until,j.work_starts_at,j.work_ends_at
from public.job_listings j
where j.moderation_status='approved' and j.status='active'
and (j.expires_at is null or j.expires_at>now())
and coalesce(j.stock_status,'available') not in ('removed','sold','archived','expired')
and not public.loadlink_marketplace_is_restricted(j.user_id)
order by j.created_at desc nulls last;
$$;
revoke all on function public.get_public_job_listings() from public;
grant execute on function public.get_public_job_listings() to anon,authenticated,service_role;

-- Owner keys remain server-side for compatibility with account-bound legacy chat.
revoke select on public.job_listings from authenticated;
revoke select(owner_key) on public.job_listings from authenticated,anon;
grant select(id,title,city,vehicle_group,rate,posted_by,contact_number,description,photos,sponsored,package_type,created_at,view_count,last_viewed_at,whatsapp_number,poster_photo,user_id,status,moderation_status,moderation_notes,moderated_at,moderated_by,listing_kind,expires_at,listing_access_period_id,dealership_id,stock_status,display_tier,boost_expires_at,payment_status,payment_reference,featured_until,lifecycle_status,province,latitude,longitude,price_amount,price_type,vehicle_type,vehicle_year,brand,model,body_type,transmission,fuel_type,axle_configuration,odometer_km,gvm_kg,payload_kg,condition,service_history,previous_owners,video_url,verification_level,completion_score,idempotency_key,submitted_at,approved_at,renewed_at,archived_at,rejection_reason,updated_at,sponsor_label,sponsored_until,duplicate_fingerprint,fraud_score,document_check_status,route_start,route_end,route_distance_km,load_type,required_equipment,rate_amount,rate_unit,payment_terms,recurrence_type,recurrence_until,work_starts_at,work_ends_at,client_request_id,dealer_stock_number,dealer_entitlement_paused,manual_credit_id,daily_billing_enabled,paused_listing_seconds) on public.job_listings to authenticated;
alter function public.loadlink_dealer_role_permissions(text) set search_path=public,pg_temp;
alter function public.loadlink_touch_updated_at() set search_path=public,pg_temp;

create table if not exists loadlink_private.listing_attention (
  listing_id uuid primary key references public.job_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dismissed_until timestamptz,
  last_notified_at timestamptz,
  last_reason text
);
alter table loadlink_private.listing_attention enable row level security;
revoke all on loadlink_private.listing_attention from public,anon,authenticated;
create index if not exists listing_attention_user_idx on loadlink_private.listing_attention(user_id,last_notified_at);
create index if not exists listing_event_recent_idx on public.listing_analytics_events(listing_id,created_at desc);
create index if not exists daily_listing_expiry_idx on public.job_listings(expires_at) where daily_billing_enabled and status='active';

create or replace function loadlink_private.preserve_paid_listing_time()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_credit public.manual_listing_credits%rowtype;
begin
  if not old.daily_billing_enabled or new.package_type<>'manual' then return new; end if;
  if old.status='active' and new.status<>'active' then
    new.paused_listing_seconds:=greatest(0,floor(extract(epoch from (old.expires_at-now())))::bigint);
  elsif old.status<>'active' and new.status='active' then
    if new.moderation_status<>'approved' then return new; end if;
    if coalesce(old.paused_listing_seconds,0)>0 then
      new.expires_at:=now()+make_interval(secs=>old.paused_listing_seconds);
    else
      select * into v_credit from public.manual_listing_credits
      where user_id=new.user_id and status='available' and duration_days=1
      order by purchased_at,id limit 1 for update skip locked;
      if v_credit.id is null then raise exception 'Add a R15 daily credit before reopening this vehicle listing.'; end if;
      new.expires_at:=now()+interval '1 day';
      update public.manual_listing_credits set status='consumed',listing_id=new.id,activated_at=now(),
        consumed_at=now(),expires_at=new.expires_at,updated_at=now() where id=v_credit.id;
    end if;
    new.paused_listing_seconds:=null;
  end if;
  return new;
end;
$$;
revoke all on function loadlink_private.preserve_paid_listing_time() from public,anon,authenticated;
drop trigger if exists loadlink_zz_preserve_paid_listing_time on public.job_listings;
create trigger loadlink_zz_preserve_paid_listing_time before update on public.job_listings
for each row execute function loadlink_private.preserve_paid_listing_time();

-- The scheduler never bills a card or creates debt. It can only consume already-paid,
-- one-day credits for listings explicitly activated under the new daily product.
create or replace function loadlink_private.renew_daily_listings()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare j record; c public.manual_listing_credits%rowtype; renewed integer:=0;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('loadlink-daily-listings',0)) then return 0; end if;
  for j in select id,user_id,expires_at from public.job_listings
    where daily_billing_enabled and package_type='manual' and status='active'
    and moderation_status='approved' and expires_at<=now()
    order by expires_at,id for update skip locked
  loop
    if public.loadlink_marketplace_is_restricted(j.user_id) then continue; end if;
    select * into c from public.manual_listing_credits
    where user_id=j.user_id and status='available' and duration_days=1
    order by purchased_at,id limit 1 for update skip locked;
    if c.id is null then
      insert into public.user_notifications(user_id,type,title,message,entity_type,entity_id,action_url,operation_id)
      select j.user_id,'listing_credit_required','Your vehicle listing needs a daily credit',
      'Your paid active time has ended. Add a R15 credit to continue advertising, or leave the listing paused.',
      'listing',j.id,'/packages','daily-credit:'||j.id::text||':'||j.expires_at::text
      where not exists(select 1 from public.user_notifications where operation_id='daily-credit:'||j.id::text||':'||j.expires_at::text);
      continue;
    end if;
    -- Visibility was already hidden after the old expiry, so no downtime is charged.
    update public.job_listings set expires_at=now()+interval '1 day',renewed_at=now() where id=j.id;
    update public.manual_listing_credits set status='consumed',listing_id=j.id,activated_at=now(),
      consumed_at=now(),expires_at=now()+interval '1 day',updated_at=now() where id=c.id;
    renewed:=renewed+1;
  end loop;
  return renewed;
end;
$$;
revoke all on function loadlink_private.renew_daily_listings() from public,anon,authenticated;

create or replace function loadlink_private.listing_recommendations(p_user_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
with metrics as (
  select j.id,j.user_id,j.title,j.created_at,j.approved_at,j.photos,j.description,
  coalesce(a.last_notified_at,'epoch'::timestamptz) last_notified_at,
  coalesce(a.dismissed_until,'epoch'::timestamptz) dismissed_until,
  greatest(count(e.id) filter(where e.event_type in ('view','listing_view')),
    (select count(*) from public.job_view_events v where v.job_id=j.id and v.viewed_at>now()-interval '72 hours' and v.viewer_user_id is distinct from j.user_id)) recent_views,
  count(e.id) filter(where e.event_type in ('chat_enquiry','enquiry','phone_click','whatsapp_click')) recent_enquiries,
  exists(select 1 from public.listing_guest_threads t where t.listing_id=j.id
    and exists(select 1 from public.listing_guest_messages m where m.thread_id=t.id and m.sender_role='buyer' and m.created_at>now()-interval '72 hours')) has_recent_thread
  from public.job_listings j
  left join loadlink_private.listing_attention a on a.listing_id=j.id
  left join public.listing_analytics_events e on e.listing_id=j.id and e.created_at>now()-interval '72 hours'
    and e.viewer_user_id is distinct from j.user_id
  where (p_user_id is null or j.user_id=p_user_id)
    and j.user_id is not null and j.listing_kind in ('vehicle','asset')
    and coalesce(j.package_type,'standard') not in ('pro','dealer')
    and j.status='active' and j.moderation_status='approved'
    and (j.expires_at is null or j.expires_at>now())
    and coalesce(j.stock_status,'available') not in ('sold','removed','archived','expired')
    and coalesce(j.approved_at,j.created_at)<now()-interval '72 hours'
    and not public.loadlink_marketplace_is_restricted(j.user_id)
    and not (coalesce(j.boost_expires_at,'epoch'::timestamptz)>now()
      or coalesce(j.featured_until,'epoch'::timestamptz)>now()
      or coalesce(j.sponsored_until,'epoch'::timestamptz)>now())
    and not exists(select 1 from public.job_boosts b where b.listing_id=j.id
      and (b.status='pending_payment' or (b.status='active' and b.expires_at>now())))
  group by j.id,a.last_notified_at,a.dismissed_until
), reasons as (
 select *,case
 when coalesce(array_length(photos,1),0)<2 or char_length(coalesce(description,''))<80 then 'improve_details'
 when recent_views<5 then 'low_visibility'
 when recent_enquiries=0 and not has_recent_thread then 'no_enquiries'
 else null end reason from metrics
)
select coalesce(jsonb_agg(jsonb_build_object('listing_id',id,'user_id',user_id,'title',title,
  'reason',reason,'recent_views',recent_views,'recent_enquiries',recent_enquiries,
  'eligible_for_notification',last_notified_at<now()-interval '7 days',
  'message',case reason
    when 'improve_details' then 'Add clear photos and useful details to help customers assess your vehicle.'
    when 'low_visibility' then 'Your vehicle has received few views in the last three days. Would you like to boost it in Promoted Listings?'
    else 'Your vehicle has had no new enquiries in the last three days. Review the price and details, or consider a boost in Promoted Listings.' end
)), '[]'::jsonb) from reasons where reason is not null and dismissed_until<=now();
$$;
revoke all on function loadlink_private.listing_recommendations(uuid) from public,anon,authenticated;

create or replace function loadlink_private.notify_listing_recommendations()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; n integer:=0; owner_id uuid; listing_id uuid; reason text;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('loadlink-listing-attention',0)) then return 0; end if;
  for r in select value from jsonb_array_elements(loadlink_private.listing_recommendations(null))
  loop
    if not (r->>'eligible_for_notification')::boolean then continue; end if;
    owner_id:=(r->>'user_id')::uuid; listing_id:=(r->>'listing_id')::uuid; reason:=r->>'reason';
    if exists(select 1 from loadlink_private.listing_attention a where a.user_id=owner_id and a.last_notified_at>now()-interval '24 hours') then continue; end if;
    insert into public.user_notifications(user_id,type,title,message,entity_type,entity_id,action_url,metadata)
    values(owner_id,case when reason='improve_details' then 'listing_quality_suggestion' else 'listing_boost_suggestion' end,
      'Your vehicle listing could use attention',r->>'message','listing',listing_id,
      '/my-posts?'||case when reason='improve_details' then 'listing=' else 'boost=' end||listing_id::text,
      jsonb_build_object('reason',reason,'recent_views',r->'recent_views','window_hours',72));
    insert into loadlink_private.listing_attention(listing_id,user_id,last_notified_at,last_reason)
    values(listing_id,owner_id,now(),reason)
    on conflict on constraint listing_attention_pkey do update set last_notified_at=excluded.last_notified_at,last_reason=excluded.last_reason;
    n:=n+1;
  end loop;
  return n;
end;
$$;
revoke all on function loadlink_private.notify_listing_recommendations() from public,anon,authenticated;

create or replace function public.loadlink_get_my_listing_recommendations()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or public.loadlink_marketplace_is_restricted(auth.uid()) then raise exception 'Authentication required'; end if;
  return loadlink_private.listing_recommendations(auth.uid());
end;
$$;
revoke all on function public.loadlink_get_my_listing_recommendations() from public,anon;
grant execute on function public.loadlink_get_my_listing_recommendations() to authenticated;

create or replace function public.loadlink_dismiss_listing_recommendation(p_listing_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not exists(select 1 from public.job_listings where id=p_listing_id and user_id=auth.uid()) then raise exception 'Listing not found'; end if;
  insert into loadlink_private.listing_attention(listing_id,user_id,dismissed_until)
  values(p_listing_id,auth.uid(),now()+interval '7 days')
  on conflict(listing_id) do update set dismissed_until=excluded.dismissed_until;
  return true;
end;
$$;
revoke all on function public.loadlink_dismiss_listing_recommendation(uuid) from public,anon;
grant execute on function public.loadlink_dismiss_listing_recommendation(uuid) to authenticated;

create or replace function public.loadlink_request_listing_boost(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.job_listings%rowtype; b public.job_boosts%rowtype;
begin
  if auth.uid() is null or public.loadlink_marketplace_is_restricted(auth.uid()) then raise exception 'Sign in required'; end if;
  select * into j from public.job_listings where id=p_listing_id and user_id=auth.uid() for update;
  if j.id is null or j.status<>'active' or j.moderation_status<>'approved'
    or (j.expires_at is not null and j.expires_at<=now()) or coalesce(j.stock_status,'available') in ('sold','removed','archived','expired') then
    raise exception 'Only your active, approved listings can be boosted.'; end if;
  if j.package_type in ('pro','dealer') then raise exception 'Promoted placement is already included with your plan.'; end if;
  select * into b from public.job_boosts where listing_id=j.id and user_id=auth.uid()
    and (status='pending_payment' or (status='active' and expires_at>now())) order by requested_at desc limit 1;
  if b.id is not null then return jsonb_build_object('id',b.id,'status',b.status,'reference',b.payment_reference,'amount_cents',b.amount_cents,'currency',b.currency,'duration_days',7,'reused',true); end if;
  insert into public.job_boosts(listing_id,user_id,amount_cents,currency,status,payment_reference,metadata)
  values(j.id,auth.uid(),1400,'ZAR','pending_payment',public.loadlink_generate_payment_reference(),jsonb_build_object('source','owner_listing_attention','duration_days',7))
  returning * into b;
  return jsonb_build_object('id',b.id,'status',b.status,'reference',b.payment_reference,'amount_cents',b.amount_cents,'currency',b.currency,'duration_days',7);
end;
$$;
revoke all on function public.loadlink_request_listing_boost(uuid) from public,anon;
grant execute on function public.loadlink_request_listing_boost(uuid) to authenticated;
revoke insert on public.job_boosts from anon,authenticated;
drop policy if exists "users request own boosts" on public.job_boosts;

-- Do not let an owner change approval, verification, ownership or trust through the Data API.
create or replace function loadlink_private.guard_dealership_approval()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')='service_role'
     or (auth.uid() is null and session_user in ('postgres','supabase_admin'))
     or public.loadlink_is_staff(array['moderator','operations','admin','owner']) then return new; end if;
  if tg_op='INSERT' then
    if new.owner_user_id is distinct from auth.uid() then raise exception 'Invalid dealership owner'; end if;
    if coalesce(new.verification_status,'pending')='approved' or coalesce(new.status,'pending')='approved'
       or coalesce(new.verified,false) or coalesce(new.is_featured,false) or new.approved_at is not null then
       raise exception 'Dealership approval requires an authorised LoadLink review.'; end if;
  else
    if new.owner_user_id is distinct from old.owner_user_id
       or new.verification_status is distinct from old.verification_status
       or new.verification_reason is distinct from old.verification_reason
       or new.status is distinct from old.status or new.verified is distinct from old.verified
       or new.approved_at is distinct from old.approved_at or new.trust_score is distinct from old.trust_score
       or new.is_featured is distinct from old.is_featured
       or new.platform_status is distinct from old.platform_status then
       raise exception 'Protected dealership fields can only be changed by LoadLink.'; end if;
  end if;
  if (coalesce(new.is_public,false) or coalesce(new.public_visible,false)) and coalesce(new.verification_status,'')<>'approved' then
    raise exception 'A dealership must be approved before publication.'; end if;
  return new;
end;
$$;
revoke all on function loadlink_private.guard_dealership_approval() from public,anon,authenticated;
drop trigger if exists loadlink_guard_dealership_approval on public.dealership_profiles;
create trigger loadlink_guard_dealership_approval before insert or update on public.dealership_profiles
for each row execute function loadlink_private.guard_dealership_approval();

-- Bound call signaling to a participant, direction and a modest payload.
alter table public.call_signals add constraint loadlink_signal_payload_size check(octet_length(payload::text)<=65536) not valid;
drop policy if exists call_signals_participant_insert on public.call_signals;
create policy call_signals_participant_insert on public.call_signals for insert to authenticated with check (
sender_user_id=(select auth.uid()) and exists(select 1 from public.call_sessions s
where s.id=session_id and s.status='active' and
((signal_type='offer' and s.caller_user_id=(select auth.uid())) or
 (signal_type='answer' and s.callee_user_id=(select auth.uid())) or
 (signal_type in ('ice','hangup') and (s.caller_user_id=(select auth.uid()) or s.callee_user_id=(select auth.uid()))))
));

create or replace function loadlink_private.expire_paid_boosts()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
  update public.job_boosts set status='expired',updated_at=now() where status='active' and expires_at<=now();
  update public.job_listings set sponsored=case when package_type in ('pro','dealer') then true else false end,
    display_tier=case when package_type='dealer' then 4 when package_type='pro' then 3 else 1 end,
    boost_expires_at=null where boost_expires_at<=now();
  get diagnostics n=row_count;
  return n;
end;
$$;
revoke all on function loadlink_private.expire_paid_boosts() from public,anon,authenticated;
create extension if not exists pg_cron;
select cron.schedule('loadlink-daily-prepaid-visibility','* * * * *','select loadlink_private.renew_daily_listings(); select loadlink_private.expire_paid_boosts();');
select cron.schedule('loadlink-listing-attention','17 * * * *','select loadlink_private.notify_listing_recommendations();');
notify pgrst,'reload schema';
