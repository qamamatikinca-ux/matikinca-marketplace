create or replace function public.loadlink_finalize_paid_plan(
  p_payment_id uuid,
  p_reference text,
  p_provider_transaction_id text,
  p_amount_cents bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  payment_row public.admin_payments%rowtype;
  user_sub public.user_subscriptions%rowtype;
  plan_price bigint;
  plan_currency text;
  plan_interval text;
  base_end timestamptz;
  period_end timestamptz;
begin
  select * into payment_row
  from public.admin_payments
  where id=p_payment_id
  for update;

  if payment_row.id is null then raise exception 'LoadLink payment record not found.'; end if;
  if payment_row.reference is distinct from p_reference then raise exception 'Payment reference mismatch.'; end if;
  if payment_row.package_type not in ('pro','dealer') then raise exception 'Invalid LoadLink plan.'; end if;

  select price_cents,currency,billing_interval
    into plan_price,plan_currency,plan_interval
  from public.subscription_plans
  where code=payment_row.package_type and is_active=true;

  if plan_price is null then raise exception 'This LoadLink plan is unavailable.'; end if;
  if p_amount_cents<>plan_price or upper(coalesce(p_currency,''))<>upper(coalesce(plan_currency,'ZAR')) then
    raise exception 'Payment amount does not match the LoadLink plan.';
  end if;

  if payment_row.status='paid' then
    return jsonb_build_object(
      'ok',true,
      'already_processed',true,
      'plan',payment_row.package_type,
      'current_period_end',(
        select coalesce(s.current_period_end,s.ends_at,s.renews_at)
        from public.user_subscriptions s
        where s.user_id=payment_row.user_id and s.plan_code=payment_row.package_type
        order by s.created_at desc limit 1
      )
    );
  end if;

  update public.admin_payments
  set status='paid',
      paid_at=coalesce(paid_at,now()),
      settled_at=coalesce(settled_at,now()),
      provider_transaction_id=nullif(p_provider_transaction_id,''),
      updated_at=now()
  where id=payment_row.id;

  select * into user_sub
  from public.user_subscriptions
  where user_id=payment_row.user_id and plan_code=payment_row.package_type
  order by created_at desc
  limit 1
  for update;

  base_end:=greatest(
    now(),
    coalesce(user_sub.current_period_end,user_sub.ends_at,user_sub.renews_at,now())
  );

  period_end:=case lower(coalesce(plan_interval,'month'))
    when 'month' then base_end+interval '1 month'
    when 'monthly' then base_end+interval '1 month'
    when 'year' then base_end+interval '1 year'
    when 'yearly' then base_end+interval '1 year'
    else null
  end;

  if period_end is null then raise exception 'Unsupported LoadLink billing interval.'; end if;

  if user_sub.id is not null then
    update public.user_subscriptions
    set status='active',
        starts_at=coalesce(starts_at,now()),
        renews_at=period_end,
        ends_at=period_end,
        current_period_end=period_end,
        payment_id=payment_row.id,
        amount_cents=payment_row.amount_cents,
        currency=payment_row.currency,
        cancelled_at=null,
        suspension_reason=null,
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('provider','paystack','reference',payment_row.reference),
        updated_at=now()
    where id=user_sub.id;
  else
    insert into public.user_subscriptions(
      user_id,plan_code,status,starts_at,renews_at,ends_at,current_period_end,
      payment_id,amount_cents,currency,metadata
    ) values (
      payment_row.user_id,payment_row.package_type,'active',now(),period_end,period_end,period_end,
      payment_row.id,payment_row.amount_cents,payment_row.currency,
      jsonb_build_object('provider','paystack','reference',payment_row.reference)
    );
  end if;

  perform public.loadlink_sync_subscription_mirror(payment_row.user_id,payment_row.package_type);
  perform public.loadlink_recompute_profile_subscription(payment_row.user_id);

  if not exists(
    select 1 from public.billing_history
    where reference=payment_row.reference and user_id=payment_row.user_id
  ) then
    insert into public.billing_history(user_id,payment_id,item_type,item_code,amount_cents,currency,status,reference)
    values(payment_row.user_id,payment_row.id,'subscription',payment_row.package_type,payment_row.amount_cents,payment_row.currency,'paid',payment_row.reference);
  end if;

  if not exists(
    select 1 from public.user_notifications
    where user_id=payment_row.user_id
      and type='plan_activated'
      and coalesce(metadata->>'reference','')=payment_row.reference
  ) then
    insert into public.user_notifications(user_id,type,title,message,action_url,metadata)
    values(
      payment_row.user_id,
      'plan_activated',
      'Your LoadLink plan is active',
      case when payment_row.package_type='dealer'
        then 'Congratulations. Your Dealer payment is active. Continue dealership setup and approval before publishing stock.'
        else 'Congratulations. Your Pro access is active. You can continue your vehicle listing now.' end,
      case when payment_row.package_type='dealer' then '/dealer' else '/list-your-vehicle?plan=pro&smart=1' end,
      jsonb_build_object('plan',payment_row.package_type,'reference',payment_row.reference)
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'already_processed',false,
    'plan',payment_row.package_type,
    'current_period_end',period_end
  );
end;
$$;
