create or replace function public.loadlink_dealer_subscription_state(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_row public.user_subscriptions%rowtype;
  v_status text := 'expired';
  v_billing_status text := 'expired';
  v_end timestamptz;
  v_grace_end timestamptz;
  v_will_renew boolean := false;
begin
  if p_user_id is null then return jsonb_build_object('status','expired','billing_status','expired','will_renew',false); end if;

  select * into v_row
  from public.user_subscriptions
  where user_id=p_user_id and plan_code='dealer'
  order by created_at desc
  limit 1;

  if v_row.id is null then return jsonb_build_object('status','expired','billing_status','expired','will_renew',false); end if;

  v_end := coalesce(v_row.current_period_end,v_row.ends_at,v_row.renews_at);
  v_billing_status := lower(coalesce(v_row.status,'expired'));
  v_status := case v_billing_status
    when 'trial' then 'active'
    when 'trialing' then 'active'
    when 'active' then 'active'
    when 'past_due' then 'past_due'
    when 'grace' then 'grace_period'
    when 'grace_period' then 'grace_period'
    when 'pending' then 'payment_pending'
    when 'pending_payment' then 'payment_pending'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    else 'expired'
  end;

  v_will_renew := v_status in ('active','past_due','grace_period');

  if v_status in ('active','grace_period') and v_end is not null and v_end <= now() then
    v_status := 'expired';
    v_will_renew := false;
  elsif v_status='cancelled' then
    if v_end is null or v_end <= now() then
      v_status := 'expired';
    else
      v_status := 'active';
    end if;
    v_will_renew := false;
  elsif v_status='past_due' then
    v_grace_end := coalesce(v_end,v_row.updated_at,v_row.created_at) + interval '5 days';
    if v_grace_end <= now() then
      v_status := 'expired';
      v_will_renew := false;
    end if;
  end if;

  return jsonb_build_object(
    'status',v_status,
    'billing_status',v_billing_status,
    'will_renew',v_will_renew,
    'renews_at',v_row.renews_at,
    'ends_at',v_end,
    'grace_ends_at',case when v_status='past_due' then v_grace_end when v_status='grace_period' then coalesce(v_end,now()+interval '5 days') else null end
  );
end;
$$;

create or replace function public.loadlink_user_has_dealer_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select coalesce((public.loadlink_dealer_subscription_state(p_user_id)->>'status') in ('active','past_due','grace_period'),false);
$$;
