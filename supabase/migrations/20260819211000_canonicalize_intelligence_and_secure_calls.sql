create or replace function public.loadlink_get_my_intelligence_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  uid uuid:=auth.uid();
  p public.profiles%rowtype;
  restriction record;
  req record;
  payment record;
  selected_sub public.user_subscriptions%rowtype;
  latest_sub public.user_subscriptions%rowtype;
  dealer public.dealership_profiles%rowtype;
  driver public.driver_profiles%rowtype;
  rule record;
  active_plan text:='standard';
  active_status text:='standard';
  period_end timestamptz:=null;
  has_history boolean:=false;
  entitled boolean:=false;
  dealer_ready boolean:=false;
  account_status text:='active';
  account_reason text:=null;
  normalized_state text:='standard';
  request_state text:=null;
  next_action text:=null;
begin
  if uid is null then
    return jsonb_build_object('authenticated',false,'account_status','active','plan','standard','plan_state','standard','capabilities',jsonb_build_object('can_post_vehicle',false,'analytics',false,'dealer_tools',false,'image_limit',5,'daily_message_limit',50));
  end if;

  select * into p from public.profiles where id=uid;
  select * into restriction from public.marketplace_user_restrictions where user_id=uid order by coalesce(updated_at,set_at) desc nulls last limit 1;
  if found and restriction.status in ('blocked','suspended') and (restriction.suspended_until is null or restriction.suspended_until>now()) then account_status:=restriction.status;account_reason:=restriction.reason;end if;

  active_plan:=coalesce(public.loadlink_active_plan(uid),'standard');
  entitled:=active_plan in ('pro','dealer');

  if entitled then
    select * into selected_sub from public.user_subscriptions where user_id=uid and plan_code=active_plan order by created_at desc limit 1;
    if selected_sub.id is not null then
      active_status:=case lower(coalesce(selected_sub.status,'active')) when 'trial' then 'trialing' else lower(coalesce(selected_sub.status,'active')) end;
      period_end:=coalesce(selected_sub.current_period_end,selected_sub.ends_at,selected_sub.renews_at);
      has_history:=true;
    else active_status:='active'; end if;
  else
    select * into latest_sub from public.user_subscriptions where user_id=uid and plan_code in ('pro','dealer') order by updated_at desc,created_at desc limit 1;
    if latest_sub.id is not null then
      has_history:=true;active_plan:=latest_sub.plan_code;period_end:=coalesce(latest_sub.current_period_end,latest_sub.ends_at,latest_sub.renews_at);
      active_status:=case when lower(coalesce(latest_sub.status,''))='past_due' then 'expired' when period_end is not null and period_end<=now() then 'expired' when lower(coalesce(latest_sub.status,'')) in ('expired','inactive','disabled','complete','cancelled','canceled') then 'expired' else lower(coalesce(latest_sub.status,'expired')) end;
    end if;
  end if;

  select * into req from public.custom_package_requests where user_id=uid and recommended_plan in ('pro','dealer') order by created_at desc limit 1;
  select * into payment from public.admin_payments where user_id=uid and req.id is not null and payment_type='subscription' and (coalesce(metadata->>'plan_request_id','')=req.id::text or (package_type=req.recommended_plan and created_at>=req.created_at)) order by created_at desc limit 1;
  select * into dealer from public.dealership_profiles where owner_user_id=uid order by created_at desc limit 1;
  if dealer.id is not null then dealer_ready:=((coalesce(dealer.status,'')='approved') or (coalesce(dealer.verification_status,'')='approved') or coalesce(dealer.verified,false)) and coalesce(dealer.platform_status,'active') not in ('blocked','suspended') and coalesce(dealer.showroom_status,'')<>'billing_hold';end if;
  select * into driver from public.driver_profiles where user_id=uid order by created_at desc limit 1;
  select * into rule from public.marketplace_plan_rules where plan_code=case when entitled then active_plan else 'standard' end limit 1;

  if req.id is not null and req.status in ('pending','pending_review') then request_state:='under_review';
  elsif req.id is not null and req.status='rejected' then request_state:='rejected';
  elsif req.id is not null and req.status='approved' then
    if payment.id is not null and payment.status='pending' then request_state:='payment_pending';
    elsif payment.id is not null and payment.status in ('failed','cancelled') then request_state:='payment_failed';
    elsif payment.id is not null and payment.status='paid' then request_state:='payment_syncing';
    else request_state:='approved_for_payment';end if;
  end if;

  if entitled then normalized_state:=active_status;elsif request_state is not null then normalized_state:=request_state;elsif has_history then normalized_state:='expired';else normalized_state:='standard';end if;
  if account_status in ('blocked','suspended') then next_action:='account_status';
  elsif entitled and active_plan='dealer' and dealer.id is null then next_action:='dealer_setup';
  elsif entitled and active_plan='dealer' and not dealer_ready then if coalesce(dealer.status,dealer.verification_status,dealer.profile_status,'') in ('rejected','changes_required') then next_action:='dealer_changes';else next_action:='dealer_review';end if;
  elsif entitled then next_action:='continue';
  elsif normalized_state in ('approved_for_payment','payment_pending','payment_failed','payment_syncing') then next_action:='payment';
  elsif normalized_state='under_review' then next_action:='wait_review';elsif normalized_state='rejected' then next_action:='review_reason';elsif normalized_state='expired' then next_action:='renew';else next_action:='choose_plan';end if;

  return jsonb_build_object('authenticated',true,'user_id',uid,'email',p.email,'role',p.role,'account_status',account_status,'account_reason',account_reason,'plan',active_plan,'plan_state',normalized_state,'current_period_end',period_end,'plan_request_id',req.id,'plan_request_plan',req.recommended_plan,'plan_request_status',req.status,'plan_request_state',request_state,'plan_request_reason',req.admin_note,'payment_status',payment.status,'payment_reference',payment.reference,'verification_status',p.verification_status,'dealer_status',coalesce(dealer.status,dealer.verification_status,dealer.profile_status),'dealer_profile_id',dealer.id,'dealer_ready',dealer_ready,'driver_status',coalesce(driver.profile_status,driver.status),'capabilities',jsonb_build_object('can_post_vehicle',account_status='active' and entitled and (active_plan='pro' or (active_plan='dealer' and dealer_ready)),'analytics',account_status='active' and entitled and coalesce(rule.analytics_enabled,false),'dealer_tools',account_status='active' and entitled and active_plan='dealer' and dealer_ready and coalesce(rule.dealership_tools_enabled,false),'image_limit',coalesce(rule.listing_image_limit,5),'daily_message_limit',coalesce(rule.daily_message_limit,50)),'next_action',next_action);
end;
$$;

create or replace function public.loadlink_start_call_session(p_conversation_id uuid,p_callee_user_id uuid)
returns table(session_id uuid,max_seconds integer,remaining_seconds integer,premium boolean,started_at timestamptz)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare v_caller uuid:=auth.uid();v_caller_plan text:='standard';v_callee_plan text:='standard';v_premium boolean:=false;v_used integer:=0;v_remaining integer:=1200;v_id uuid;v_started timestamptz;
begin
  if v_caller is null then raise exception 'AUTH_REQUIRED';end if;
  if p_conversation_id is null or p_callee_user_id is null or p_callee_user_id=v_caller then raise exception 'INVALID_CALL';end if;
  v_caller_plan:=coalesce(public.loadlink_active_plan(v_caller),'standard');v_callee_plan:=coalesce(public.loadlink_active_plan(p_callee_user_id),'standard');
  if not exists(select 1 from public.profiles where id=p_callee_user_id) then raise exception 'CALL_USER_NOT_FOUND';end if;
  update public.call_sessions set ended_at=least(now(),started_at+make_interval(secs=>max_seconds)),status='limit_reached',end_reason='server_limit' where conversation_id=p_conversation_id and status='active' and now()>=started_at+make_interval(secs=>max_seconds);
  if exists(select 1 from public.call_sessions where conversation_id=p_conversation_id and status='active' and (caller_user_id in (v_caller,p_callee_user_id) or callee_user_id in (v_caller,p_callee_user_id))) then raise exception 'CALL_ALREADY_ACTIVE';end if;
  v_premium:=v_caller_plan in ('pro','dealer') and v_callee_plan in ('pro','dealer');
  if v_premium then v_remaining:=7200;else
    select coalesce(sum(greatest(0,least(max_seconds,floor(extract(epoch from (coalesce(ended_at,now())-started_at)))::integer))),0)::integer into v_used from public.call_sessions where conversation_id=p_conversation_id and started_at>=date_trunc('day',now()) and status in ('active','ended','limit_reached');
    v_remaining:=greatest(0,1200-v_used);if v_remaining<=0 then raise exception 'CALL_LIMIT_REACHED';end if;
  end if;
  insert into public.call_sessions(conversation_id,caller_user_id,callee_user_id,plan_at_start,max_seconds) values(p_conversation_id,v_caller,p_callee_user_id,case when v_premium then 'pro' else 'standard' end,v_remaining) returning id,call_sessions.started_at into v_id,v_started;
  return query select v_id,v_remaining,v_remaining,v_premium,v_started;
end;
$$;
revoke all on function public.loadlink_start_call_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.loadlink_start_call_session(uuid,uuid) to service_role;

create or replace function public.loadlink_start_call_for_conversation(p_conversation_id uuid)
returns table(session_id uuid,max_seconds integer,remaining_seconds integer,premium boolean,started_at timestamptz,callee_user_id uuid)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare v_user uuid:=auth.uid();v_buyer uuid;v_owner uuid;v_callee uuid;v_request_status text;v_started record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED';end if;
  if public.loadlink_account_is_restricted(v_user) then raise exception 'ACCOUNT_ACCESS_RESTRICTED';end if;
  select public.loadlink_chat_user_id_from_hash(t.buyer_hash),j.user_id,t.request_status into v_buyer,v_owner,v_request_status from public.listing_guest_threads t join public.job_listings j on j.id=t.listing_id where t.id=p_conversation_id;
  if not found or v_buyer is null or v_owner is null then raise exception 'CALL_CONVERSATION_UNAVAILABLE';end if;
  if exists(select 1 from public.listing_guest_blocks b where b.thread_id=p_conversation_id) then raise exception 'CALL_CONVERSATION_BLOCKED';end if;
  if coalesce(v_request_status,'pending')<>'accepted' then raise exception 'CALL_REQUEST_NOT_ACCEPTED';end if;
  if v_user=v_buyer then v_callee:=v_owner;elsif v_user=v_owner then v_callee:=v_buyer;else raise exception 'CALL_FORBIDDEN';end if;
  if public.loadlink_account_is_restricted(v_callee) then raise exception 'CALL_USER_UNAVAILABLE';end if;
  select * into v_started from public.loadlink_start_call_session(p_conversation_id,v_callee);
  return query select v_started.session_id,v_started.max_seconds,v_started.remaining_seconds,v_started.premium,v_started.started_at,v_callee;
end;
$$;
revoke all on function public.loadlink_start_call_for_conversation(uuid) from public,anon;
grant execute on function public.loadlink_start_call_for_conversation(uuid) to authenticated,service_role;
