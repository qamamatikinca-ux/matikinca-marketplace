-- Owner/Admin controlled Pro and Dealer trials.
-- Trials use the subscription engine's existing trial state and never fabricate a payment.

create or replace function public.loadlink_owner_grant_plan_trial(
  p_email text,
  p_plan text,
  p_days integer default 14,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  staff_role text := public.loadlink_phase2_admin_role();
  clean_email text := lower(trim(coalesce(p_email, '')));
  clean_plan text := lower(trim(coalesce(p_plan, '')));
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
  target_user uuid;
  target_name text;
  trial_row public.user_subscriptions%rowtype;
  trial_id uuid;
  period_end timestamptz;
  previous_row jsonb;
begin
  if staff_role not in ('owner', 'admin') then
    raise exception 'Trial management access denied' using errcode = '42501';
  end if;

  if clean_email = '' or position('@' in clean_email) < 2 then
    raise exception 'Enter a valid customer email' using errcode = '22023';
  end if;
  if clean_plan not in ('pro', 'dealer') then
    raise exception 'Trial plan must be Pro or Dealer' using errcode = '22023';
  end if;
  if p_days is null or p_days < 1 or p_days > 60 then
    raise exception 'Trial length must be between 1 and 60 days' using errcode = '22023';
  end if;
  if clean_reason is not null and char_length(clean_reason) > 240 then
    raise exception 'Trial note is too long' using errcode = '22023';
  end if;

  select u.id, coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.company_name), ''), split_part(clean_email, '@', 1))
  into target_user, target_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, p.email, '')) = clean_email
  limit 1;

  if target_user is null then
    raise exception 'No LoadLink customer was found for that email' using errcode = 'P0002';
  end if;

  if clean_plan = 'pro' and exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = target_user
      and s.plan_code = 'dealer'
      and s.status in ('trial','trialing','active','grace_period','cancelled')
      and (coalesce(s.current_period_end, s.ends_at, s.renews_at) is null or coalesce(s.current_period_end, s.ends_at, s.renews_at) > now())
  ) then
    raise exception 'This customer already has active Dealer access';
  end if;

  if exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = target_user
      and s.plan_code = clean_plan
      and (s.payment_id is not null or coalesce(s.amount_cents, 0) > 0 or coalesce(s.metadata->>'provider','') <> '')
      and s.status in ('active','grace_period','cancelled','past_due')
      and (
        (s.status <> 'past_due' and (coalesce(s.current_period_end, s.ends_at, s.renews_at) is null or coalesce(s.current_period_end, s.ends_at, s.renews_at) > now()))
        or (s.status = 'past_due' and coalesce(s.current_period_end, s.ends_at, s.renews_at, s.updated_at, s.created_at) + interval '5 days' > now())
      )
  ) then
    raise exception 'This customer already has paid access to that plan';
  end if;

  select * into trial_row
  from public.user_subscriptions s
  where s.user_id = target_user
    and s.plan_code = clean_plan
    and s.status in ('trial','trialing')
    and coalesce(s.metadata->>'source','') = 'owner_trial'
  order by s.created_at desc
  limit 1
  for update;

  if trial_row.id is not null then
    previous_row := to_jsonb(trial_row);
    period_end := greatest(now(), coalesce(trial_row.current_period_end, trial_row.ends_at, trial_row.renews_at, now())) + make_interval(days => p_days);
    update public.user_subscriptions
    set status = 'trial',
        starts_at = coalesce(starts_at, now()),
        renews_at = period_end,
        ends_at = period_end,
        current_period_end = period_end,
        payment_id = null,
        amount_cents = 0,
        currency = 'ZAR',
        cancelled_at = null,
        suspension_reason = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'source', 'owner_trial',
          'last_granted_by', auth.uid(),
          'last_granted_at', now(),
          'last_grant_days', p_days,
          'reason', clean_reason
        ),
        updated_at = now()
    where id = trial_row.id
    returning id into trial_id;
  else
    period_end := now() + make_interval(days => p_days);
    insert into public.user_subscriptions(
      user_id, plan_code, status, starts_at, renews_at, ends_at, current_period_end,
      payment_id, amount_cents, currency, metadata
    ) values (
      target_user, clean_plan, 'trial', now(), period_end, period_end, period_end,
      null, 0, 'ZAR', jsonb_build_object(
        'source', 'owner_trial',
        'granted_by', auth.uid(),
        'granted_at', now(),
        'last_grant_days', p_days,
        'reason', clean_reason
      )
    ) returning id into trial_id;
  end if;

  perform public.loadlink_recompute_profile_subscription(target_user);

  insert into public.user_notifications(user_id, type, title, message, action_url, metadata)
  values (
    target_user,
    'plan_trial_activated',
    case when clean_plan = 'dealer' then 'Your LoadLink Dealer trial is active' else 'Your LoadLink Pro trial is active' end,
    'Your ' || initcap(clean_plan) || ' access is available until ' || to_char(period_end at time zone 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI') || '.',
    case when clean_plan = 'dealer' then '/dealer' else '/packages' end,
    jsonb_build_object('plan', clean_plan, 'trial', true, 'ends_at', period_end)
  );

  insert into public.admin_audit_trail(actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    'plan_trial_granted',
    'user_subscription',
    trial_id::text,
    previous_row,
    jsonb_build_object('user_id', target_user, 'plan', clean_plan, 'days', p_days, 'ends_at', period_end, 'reason', clean_reason)
  );

  return jsonb_build_object(
    'ok', true,
    'subscription_id', trial_id,
    'user_id', target_user,
    'customer_name', target_name,
    'email', clean_email,
    'plan', clean_plan,
    'ends_at', period_end
  );
end;
$$;

create or replace function public.loadlink_owner_end_plan_trial(p_subscription_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  staff_role text := public.loadlink_phase2_admin_role();
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
  trial_row public.user_subscriptions%rowtype;
begin
  if staff_role not in ('owner', 'admin') then
    raise exception 'Trial management access denied' using errcode = '42501';
  end if;
  if clean_reason is not null and char_length(clean_reason) > 240 then
    raise exception 'Trial note is too long' using errcode = '22023';
  end if;

  select * into trial_row
  from public.user_subscriptions
  where id = p_subscription_id
  for update;

  if trial_row.id is null
     or trial_row.status not in ('trial','trialing')
     or coalesce(trial_row.metadata->>'source','') <> 'owner_trial'
     or trial_row.payment_id is not null
     or coalesce(trial_row.amount_cents, 0) <> 0 then
    raise exception 'Only Owner-granted active trials can be ended here';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      renews_at = now(),
      ends_at = now(),
      current_period_end = now(),
      cancelled_at = now(),
      cancellation_reason = coalesce(clean_reason, 'Ended by LoadLink Control Centre'),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('ended_by', auth.uid(), 'ended_at', now()),
      updated_at = now()
  where id = trial_row.id;

  perform public.loadlink_recompute_profile_subscription(trial_row.user_id);

  insert into public.user_notifications(user_id, type, title, message, action_url, metadata)
  values (
    trial_row.user_id,
    'plan_trial_ended',
    'Your LoadLink trial has ended',
    'Your ' || initcap(trial_row.plan_code) || ' trial access has ended.',
    '/packages',
    jsonb_build_object('plan', trial_row.plan_code, 'trial', true, 'ended_at', now())
  );

  insert into public.admin_audit_trail(actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), 'plan_trial_ended', 'user_subscription', trial_row.id::text,
    to_jsonb(trial_row),
    jsonb_build_object('status', 'cancelled', 'ended_at', now(), 'reason', clean_reason)
  );

  return jsonb_build_object('ok', true, 'subscription_id', trial_row.id, 'user_id', trial_row.user_id, 'plan', trial_row.plan_code);
end;
$$;

create or replace function public.loadlink_owner_plan_trial_queue(p_limit integer default 100)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if public.loadlink_phase2_admin_role() not in ('owner', 'admin') then
    raise exception 'Trial management access denied' using errcode = '42501';
  end if;

  return query
  select jsonb_build_object(
    'subscription_id', s.id,
    'user_id', s.user_id,
    'customer_name', coalesce(nullif(trim(p.full_name),''), nullif(trim(p.company_name),''), 'LoadLink member'),
    'email', coalesce(u.email, p.email),
    'plan', s.plan_code,
    'status', s.status,
    'starts_at', s.starts_at,
    'ends_at', coalesce(s.current_period_end, s.ends_at, s.renews_at),
    'reason', s.metadata->>'reason',
    'created_at', s.created_at,
    'updated_at', s.updated_at
  )
  from public.user_subscriptions s
  left join public.profiles p on p.id = s.user_id
  left join auth.users u on u.id = s.user_id
  where coalesce(s.metadata->>'source','') = 'owner_trial'
  order by
    case when s.status in ('trial','trialing') and coalesce(s.current_period_end, s.ends_at, s.renews_at) > now() then 0 else 1 end,
    s.updated_at desc
  limit greatest(1, least(coalesce(p_limit,100), 250));
end;
$$;

revoke execute on function public.loadlink_owner_grant_plan_trial(text, text, integer, text) from public, anon;
revoke execute on function public.loadlink_owner_end_plan_trial(uuid, text) from public, anon;
revoke execute on function public.loadlink_owner_plan_trial_queue(integer) from public, anon;
grant execute on function public.loadlink_owner_grant_plan_trial(text, text, integer, text) to authenticated;
grant execute on function public.loadlink_owner_end_plan_trial(uuid, text) to authenticated;
grant execute on function public.loadlink_owner_plan_trial_queue(integer) to authenticated;
