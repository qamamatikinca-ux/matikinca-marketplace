create table if not exists public.paystack_webhook_events (
  event_key text primary key,
  event_type text not null,
  subscription_code text,
  user_id uuid references auth.users(id) on delete set null,
  plan_code text,
  received_at timestamptz not null default now()
);

create index if not exists paystack_webhook_events_subscription_idx
  on public.paystack_webhook_events(subscription_code, received_at desc);

alter table public.paystack_webhook_events enable row level security;
revoke all on table public.paystack_webhook_events from anon, authenticated;
grant select, insert, update on table public.paystack_webhook_events to service_role;

create or replace function public.loadlink_sync_subscription_mirror(p_user_id uuid, p_plan_code text)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_user public.user_subscriptions%rowtype;
  v_loadlink_id uuid;
begin
  select * into v_user
  from public.user_subscriptions
  where user_id = p_user_id and plan_code = p_plan_code
  order by created_at desc
  limit 1
  for update;

  if v_user.id is null then
    raise exception 'LoadLink subscription record not found.';
  end if;

  select id into v_loadlink_id
  from public.loadlink_subscriptions
  where user_id = p_user_id and plan_code = p_plan_code
  order by created_at desc
  limit 1
  for update;

  if v_loadlink_id is null then
    insert into public.loadlink_subscriptions(
      user_id, plan_code, status, amount_cents, currency, started_at,
      current_period_end, cancelled_at, suspension_reason, metadata, updated_at
    ) values (
      v_user.user_id, v_user.plan_code, v_user.status, v_user.amount_cents,
      v_user.currency, coalesce(v_user.starts_at, now()),
      coalesce(v_user.current_period_end, v_user.ends_at, v_user.renews_at),
      v_user.cancelled_at, v_user.suspension_reason,
      coalesce(v_user.metadata, '{}'::jsonb), now()
    );
  else
    update public.loadlink_subscriptions
    set status = v_user.status,
        amount_cents = v_user.amount_cents,
        currency = v_user.currency,
        started_at = coalesce(started_at, v_user.starts_at, now()),
        current_period_end = coalesce(v_user.current_period_end, v_user.ends_at, v_user.renews_at),
        cancelled_at = v_user.cancelled_at,
        suspension_reason = v_user.suspension_reason,
        metadata = coalesce(v_user.metadata, '{}'::jsonb),
        updated_at = now()
    where id = v_loadlink_id;
  end if;
end;
$$;

revoke all on function public.loadlink_sync_subscription_mirror(uuid,text) from public, anon, authenticated;
grant execute on function public.loadlink_sync_subscription_mirror(uuid,text) to service_role;

create or replace function public.loadlink_recompute_profile_subscription(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_plan text;
begin
  select plan_code into v_plan
  from public.user_subscriptions
  where user_id = p_user_id
    and plan_code in ('pro','dealer')
    and (
      (status in ('trial','trialing','active','grace_period') and (coalesce(current_period_end,ends_at,renews_at) is null or coalesce(current_period_end,ends_at,renews_at)>now()))
      or (status='cancelled' and coalesce(current_period_end,ends_at,renews_at) is not null and coalesce(current_period_end,ends_at,renews_at)>now())
      or (status='past_due' and coalesce(current_period_end,ends_at,renews_at,updated_at,created_at)+interval '5 days'>now())
    )
  order by case when plan_code='dealer' then 2 else 1 end desc, updated_at desc, created_at desc
  limit 1;

  update public.profiles
  set subscription_plan=coalesce(v_plan,'standard'), updated_at=now()
  where id=p_user_id and subscription_plan is distinct from coalesce(v_plan,'standard');

  return coalesce(v_plan,'standard');
end;
$$;

revoke all on function public.loadlink_recompute_profile_subscription(uuid) from public, anon, authenticated;
grant execute on function public.loadlink_recompute_profile_subscription(uuid) to service_role;

create or replace function public.loadlink_apply_paystack_subscription_event(
  p_event_key text,
  p_event_type text,
  p_subscription_code text,
  p_plan_code text default null,
  p_user_id uuid default null,
  p_customer_code text default null,
  p_next_payment_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_inserted text;
  v_sub public.user_subscriptions%rowtype;
  v_notification_type text;
  v_title text;
  v_message text;
  v_action_url text;
begin
  if nullif(btrim(coalesce(p_event_key,'')), '') is null then raise exception 'Paystack event key is required.'; end if;
  if p_event_type not in ('subscription.create','invoice.payment_failed','subscription.not_renew','subscription.disable') then raise exception 'Unsupported Paystack subscription event.'; end if;
  if nullif(btrim(coalesce(p_subscription_code,'')), '') is null then raise exception 'Paystack subscription code is required.'; end if;

  insert into public.paystack_webhook_events(event_key,event_type,subscription_code,user_id,plan_code)
  values(p_event_key,p_event_type,p_subscription_code,p_user_id,p_plan_code)
  on conflict(event_key) do nothing
  returning event_key into v_inserted;

  if v_inserted is null then return jsonb_build_object('ok',true,'already_processed',true); end if;

  if p_event_type='subscription.create' then
    if p_user_id is null or p_plan_code not in ('pro','dealer') then raise exception 'Paystack subscription could not be matched to a LoadLink plan.'; end if;
    select * into v_sub from public.user_subscriptions where user_id=p_user_id and plan_code=p_plan_code order by created_at desc limit 1 for update;
  else
    select * into v_sub from public.user_subscriptions where coalesce(metadata->>'paystack_subscription_code','')=p_subscription_code order by updated_at desc,created_at desc limit 1 for update;
  end if;

  if v_sub.id is null then raise exception 'Paystack subscription is not linked to a LoadLink subscription yet.'; end if;

  if p_event_type='subscription.create' then
    update public.user_subscriptions
    set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object(
      'paystack_subscription_code',p_subscription_code,
      'paystack_plan_code',p_plan_code,
      'paystack_customer_code',nullif(p_customer_code,''),
      'next_payment_date',p_next_payment_date
    )), updated_at=now()
    where id=v_sub.id;
  elsif p_event_type='invoice.payment_failed' then
    update public.user_subscriptions
    set status='past_due',suspension_reason='Recurring payment failed',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_paystack_event',p_event_type,'paystack_subscription_code',p_subscription_code),updated_at=now()
    where id=v_sub.id;
    v_notification_type:='payment_failed';v_title:='Your LoadLink payment needs attention';v_message:='The latest renewal did not complete. Update your payment method to keep paid features active.';v_action_url:='/packages?manage=1';
  elsif p_event_type='subscription.not_renew' then
    update public.user_subscriptions
    set status='cancelled',cancelled_at=coalesce(cancelled_at,now()),suspension_reason=null,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_paystack_event',p_event_type,'paystack_subscription_code',p_subscription_code),updated_at=now()
    where id=v_sub.id;
    v_notification_type:='plan_cancelled';v_title:='Your LoadLink plan will not renew';v_message:='Your current paid period stays available until it ends.';v_action_url:='/packages';
  elsif p_event_type='subscription.disable' then
    update public.user_subscriptions
    set status='expired',cancelled_at=coalesce(cancelled_at,now()),suspension_reason=null,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_paystack_event',p_event_type,'paystack_subscription_code',p_subscription_code),updated_at=now()
    where id=v_sub.id;
    v_notification_type:='plan_expired';v_title:='Your LoadLink plan has ended';v_message:='Renew when you are ready to continue using paid LoadLink features.';v_action_url:='/packages';
  end if;

  select * into v_sub from public.user_subscriptions where id=v_sub.id;
  perform public.loadlink_sync_subscription_mirror(v_sub.user_id,v_sub.plan_code);
  perform public.loadlink_recompute_profile_subscription(v_sub.user_id);

  update public.paystack_webhook_events set user_id=v_sub.user_id,plan_code=v_sub.plan_code where event_key=p_event_key;

  if v_notification_type is not null then
    insert into public.user_notifications(user_id,type,title,message,action_url,metadata)
    values(v_sub.user_id,v_notification_type,v_title,v_message,v_action_url,jsonb_build_object('plan',v_sub.plan_code,'subscription_code',p_subscription_code,'paystack_event_key',p_event_key));
  end if;

  return jsonb_build_object('ok',true,'already_processed',false,'user_id',v_sub.user_id,'plan',v_sub.plan_code,'status',v_sub.status);
end;
$$;

revoke all on function public.loadlink_apply_paystack_subscription_event(text,text,text,text,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.loadlink_apply_paystack_subscription_event(text,text,text,text,uuid,text,timestamptz) to service_role;

with ranked as (
  select l.*,row_number() over(partition by l.user_id,l.plan_code order by l.created_at desc nulls last,l.id desc) as rn
  from public.loadlink_subscriptions l
  where l.user_id is not null and l.plan_code in ('pro','dealer')
)
insert into public.user_subscriptions(user_id,plan_code,status,starts_at,renews_at,ends_at,amount_cents,currency,current_period_end,suspension_reason,cancelled_at,metadata,created_at,updated_at)
select r.user_id,r.plan_code,case when r.status='trialing' then 'trial' else coalesce(r.status,'expired') end,r.started_at,r.current_period_end,r.current_period_end,coalesce(r.amount_cents,0),coalesce(r.currency,'ZAR'),r.current_period_end,r.suspension_reason,r.cancelled_at,coalesce(r.metadata,'{}'::jsonb)||jsonb_build_object('reconciled_from','loadlink_subscriptions'),coalesce(r.created_at,now()),coalesce(r.updated_at,now())
from ranked r
where r.rn=1
  and not exists(select 1 from public.user_subscriptions u where u.user_id=r.user_id and u.plan_code=r.plan_code)
  and not exists(select 1 from public.user_subscriptions u where u.user_id=r.user_id and u.status in ('pending','trial','active','past_due','suspended'));

do $$
declare r record;
begin
  for r in select distinct on (user_id,plan_code) user_id,plan_code from public.user_subscriptions where plan_code in ('pro','dealer') order by user_id,plan_code,created_at desc loop
    perform public.loadlink_sync_subscription_mirror(r.user_id,r.plan_code);
  end loop;
end;
$$;

create or replace function public.loadlink_active_plan(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select s.plan_code
  from public.user_subscriptions s
  where s.user_id=p_user_id and s.plan_code in ('pro','dealer') and (
    (s.status in ('trial','trialing','active','grace_period') and (coalesce(s.current_period_end,s.ends_at,s.renews_at) is null or coalesce(s.current_period_end,s.ends_at,s.renews_at)>now()))
    or (s.status='cancelled' and coalesce(s.current_period_end,s.ends_at,s.renews_at) is not null and coalesce(s.current_period_end,s.ends_at,s.renews_at)>now())
    or (s.status='past_due' and coalesce(s.current_period_end,s.ends_at,s.renews_at,s.updated_at,s.created_at)+interval '5 days'>now())
  )
  order by case when s.plan_code='dealer' then 2 else 1 end desc,s.updated_at desc,s.created_at desc
  limit 1;
$$;

create or replace function public.loadlink_dealer_subscription_state(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_row public.user_subscriptions%rowtype;
  v_status text:='expired';
  v_end timestamptz;
  v_grace_end timestamptz;
begin
  if p_user_id is null then return jsonb_build_object('status','expired'); end if;
  select * into v_row from public.user_subscriptions where user_id=p_user_id and plan_code='dealer' order by created_at desc limit 1;
  if v_row.id is null then return jsonb_build_object('status','expired'); end if;

  v_end:=coalesce(v_row.current_period_end,v_row.ends_at,v_row.renews_at);
  v_status:=case lower(coalesce(v_row.status,'expired'))
    when 'trial' then 'active' when 'trialing' then 'active' when 'active' then 'active' when 'past_due' then 'past_due'
    when 'grace' then 'grace_period' when 'grace_period' then 'grace_period' when 'pending' then 'payment_pending' when 'pending_payment' then 'payment_pending'
    when 'cancelled' then 'cancelled' when 'canceled' then 'cancelled' else 'expired' end;

  if v_status in ('active','grace_period') and v_end is not null and v_end<=now() then v_status:='expired';
  elsif v_status='cancelled' and (v_end is null or v_end<=now()) then v_status:='expired';
  elsif v_status='past_due' then
    v_grace_end:=coalesce(v_end,v_row.updated_at,v_row.created_at)+interval '5 days';
    if v_grace_end<=now() then v_status:='expired'; end if;
  end if;

  return jsonb_build_object('status',v_status,'renews_at',v_row.renews_at,'ends_at',v_end,'grace_ends_at',case when v_status='past_due' then v_grace_end when v_status='grace_period' then coalesce(v_end,now()+interval '5 days') else null end);
end;
$$;

create or replace function public.loadlink_user_has_dealer_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select coalesce((public.loadlink_dealer_subscription_state(p_user_id)->>'status') in ('active','past_due','grace_period','cancelled'),false);
$$;

do $$
declare r record;
begin
  for r in select distinct user_id from public.user_subscriptions where user_id is not null and plan_code in ('pro','dealer') loop
    perform public.loadlink_recompute_profile_subscription(r.user_id);
  end loop;
end;
$$;
