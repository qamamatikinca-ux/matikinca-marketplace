-- LoadLink final-audit package, driver-review and negotiated-payment integrity.

create or replace function public.loadlink_validate_dealer_custom_request()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare
  f jsonb:=coalesce(new.requested_features,'{}'::jsonb);
  dealer_intent boolean:=false;
  photos int:=0;
  listings int:=0;
  seats int:=1;
  effective_amount int:=0;
begin
  begin photos:=coalesce(nullif(f->>'photos','')::int,0); exception when others then photos:=0; end;
  begin listings:=coalesce(nullif(f->>'listings','')::int,0); exception when others then listings:=0; end;
  begin seats:=coalesce(nullif(f->>'teamSeats','')::int,1); exception when others then seats:=1; end;
  dealer_intent:=coalesce((f->>'showroom')::boolean,false) or seats>1 or listings>=10 or new.recommended_plan='dealer';
  effective_amount:=coalesce(new.final_amount_cents,new.estimated_amount_cents,0);
  if dealer_intent then
    if photos<10 then raise exception 'Dealer-tailored packages require at least 10 photos per vehicle'; end if;
    if effective_amount<250000 then raise exception 'Dealer-tailored packages cannot be approved below R2 500/month'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.loadlink_admin_package_request_queue(p_status text default 'all',p_limit integer default 100,p_offset integer default 0)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['finance','operations','admin','owner']) then raise exception 'Admin permission required'; end if;
  if coalesce(p_status,'all') not in ('all','pending_review','approved','rejected') then raise exception 'Invalid package request status'; end if;
  return query
  select jsonb_build_object(
    'id',r.id,'user_id',r.user_id,
    'user_name',coalesce(nullif(trim(p.full_name),''),nullif(trim(p.company_name),''),'LoadLink user'),'user_email',p.email,
    'requested_features',coalesce(r.requested_features,'{}'::jsonb),'estimated_amount_cents',r.estimated_amount_cents,
    'final_amount_cents',r.final_amount_cents,'recommended_plan',r.recommended_plan,'status',r.status,
    'admin_note',r.admin_note,'created_at',r.created_at,'reviewed_at',r.reviewed_at
  )
  from public.custom_package_requests r
  left join public.profiles p on p.id=r.user_id
  where coalesce(p_status,'all')='all' or r.status=coalesce(p_status,'all')
  order by case when r.status='pending_review' then 0 else 1 end,r.created_at asc
  limit greatest(1,least(coalesce(p_limit,100),200))
  offset greatest(0,coalesce(p_offset,0));
end;
$$;
revoke all on function public.loadlink_admin_package_request_queue(text,integer,integer) from public,anon;
grant execute on function public.loadlink_admin_package_request_queue(text,integer,integer) to authenticated;

create or replace function public.loadlink_admin_review_package_request(
  p_request_id uuid,p_action text,p_final_amount_cents integer default null,p_admin_note text default null,p_fulfilment_plan text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_row public.custom_package_requests%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_plan text;
  v_amount integer;
  v_note text:=nullif(trim(coalesce(p_admin_note,'')),'');
  v_plan_price integer;
  v_features jsonb;
  v_showroom boolean:=false;
  v_seats integer:=1;
  v_listings integer:=0;
  v_photos integer:=0;
  v_dealer_intent boolean:=false;
begin
  if not public.loadlink_is_staff(array['finance','operations','admin','owner']) then raise exception 'Admin permission required'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid package review action'; end if;

  select * into v_row from public.custom_package_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'Package request not found'; end if;
  v_before:=to_jsonb(v_row);

  if p_action='reject' then
    if length(coalesce(v_note,''))<5 then raise exception 'A clear rejection reason is required'; end if;
    update public.custom_package_requests set status='rejected',final_amount_cents=null,admin_note=v_note,reviewed_at=now()
    where id=p_request_id returning to_jsonb(custom_package_requests.*) into v_after;
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
    values(v_row.user_id,'plan_request_review','Plan request update',v_note,'/packages','package_request',p_request_id,jsonb_build_object('status','rejected'));
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'package_request.rejected','package_request',p_request_id::text,v_before,v_after);
    return jsonb_build_object('ok',true,'status','rejected','request_id',p_request_id);
  end if;

  v_features:=coalesce(v_row.requested_features,'{}'::jsonb);
  begin v_showroom:=coalesce((v_features->>'showroom')::boolean,false); exception when others then v_showroom:=false; end;
  begin v_seats:=coalesce(nullif(v_features->>'teamSeats','')::int,1); exception when others then v_seats:=1; end;
  begin v_listings:=coalesce(nullif(v_features->>'listings','')::int,0); exception when others then v_listings:=0; end;
  begin v_photos:=coalesce(nullif(v_features->>'photos','')::int,0); exception when others then v_photos:=0; end;
  v_dealer_intent:=v_showroom or v_seats>1 or v_listings>=10 or v_row.recommended_plan='dealer';

  v_plan:=case
    when v_dealer_intent then 'dealer'
    when v_row.recommended_plan in ('pro','dealer') then v_row.recommended_plan
    when p_fulfilment_plan in ('pro','dealer') then p_fulfilment_plan
    else null
  end;
  if v_plan is null then raise exception 'Choose Pro or Dealer as the fulfilment plan before approval'; end if;
  if v_dealer_intent and v_plan<>'dealer' then raise exception 'This tailored request requires Dealer entitlement'; end if;
  if v_dealer_intent and v_photos<10 then raise exception 'Dealer-tailored packages require at least 10 photos per vehicle'; end if;

  select price_cents::integer into v_plan_price from public.subscription_plans where code=v_plan and is_active=true;
  if v_plan_price is null then raise exception 'The selected LoadLink plan is unavailable'; end if;
  v_amount:=coalesce(p_final_amount_cents,v_row.final_amount_cents,v_row.estimated_amount_cents,v_plan_price);
  if v_amount is null or v_amount<1 then raise exception 'Enter a valid approved monthly amount'; end if;
  if v_dealer_intent and v_amount<250000 then raise exception 'Dealer-tailored packages cannot be approved below R2 500/month'; end if;

  update public.custom_package_requests
  set status='approved',recommended_plan=v_plan,final_amount_cents=v_amount,admin_note=v_note,reviewed_at=now()
  where id=p_request_id returning to_jsonb(custom_package_requests.*) into v_after;

  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(v_row.user_id,'plan_request_review','Your LoadLink plan is approved',
    'Your '||initcap(v_plan)||' request is approved at R'||to_char(v_amount/100.0,'FM999G999G990D00')||' per month. Continue to secure payment when you are ready.',
    '/packages','package_request',p_request_id,jsonb_build_object('status','approved','plan',v_plan,'amount_cents',v_amount));
  insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'package_request.approved','package_request',p_request_id::text,v_before,v_after);
  return jsonb_build_object('ok',true,'status','approved','request_id',p_request_id,'plan',v_plan,'amount_cents',v_amount);
end;
$$;
revoke all on function public.loadlink_admin_review_package_request(uuid,text,integer,text,text) from public,anon;
grant execute on function public.loadlink_admin_review_package_request(uuid,text,integer,text,text) to authenticated;

create or replace function public.loadlink_admin_driver_queue(p_status text default 'pending',p_limit integer default 100,p_offset integer default 0)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then raise exception 'Admin permission required'; end if;
  if coalesce(p_status,'pending') not in ('all','draft','pending','approved','rejected','suspended') then raise exception 'Invalid driver status'; end if;
  return query
  select jsonb_build_object(
    'id',d.id,'user_id',d.user_id,'full_name',d.full_name,'headline',d.headline,'city',d.city,'province',d.province,
    'phone',d.phone,'email',coalesce(d.email,p.email),'years_experience',d.years_experience,'licence_code',d.licence_code,
    'licence_expiry',coalesce(d.licence_expires_at,d.licence_expiry),'prdp_required',d.prdp_required,'prdp_expiry',coalesce(d.prdp_expires_at,d.prdp_expiry),
    'vehicle_types',d.vehicle_types,'route_experience',d.route_experience,'languages',d.languages,'previous_roles',d.previous_roles,
    'availability',d.availability,'bio',d.bio,'status',d.status,'profile_status',d.profile_status,'verification_level',d.verification_level,
    'review_reason',d.review_reason,'profile_image_url',d.profile_image_url,'submitted_at',d.submitted_at,'created_at',d.created_at,
    'documents',coalesce((select jsonb_agg(jsonb_build_object(
      'id',x.id,'document_type',x.document_type,'storage_path',x.storage_path,'original_filename',x.original_filename,
      'mime_type',x.mime_type,'size_bytes',x.size_bytes,'validation_status',x.validation_status,'uploaded_at',x.uploaded_at
    ) order by x.document_type) from public.driver_documents x where x.profile_id=d.id),'[]'::jsonb)
  )
  from public.driver_profiles d
  left join public.profiles p on p.id=d.user_id
  where coalesce(p_status,'pending')='all' or d.status=coalesce(p_status,'pending')
  order by case when d.status='pending' then 0 else 1 end,d.submitted_at asc nulls last,d.created_at asc
  limit greatest(1,least(coalesce(p_limit,100),200))
  offset greatest(0,coalesce(p_offset,0));
end;
$$;
revoke all on function public.loadlink_admin_driver_queue(text,integer,integer) from public,anon;
grant execute on function public.loadlink_admin_driver_queue(text,integer,integer) to authenticated;

create or replace function public.loadlink_admin_review_driver(p_driver_id uuid,p_action text,p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_user uuid;
  v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then raise exception 'Admin permission required'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid driver review action'; end if;
  if p_action='reject' and length(coalesce(v_reason,''))<5 then raise exception 'A clear rejection reason is required'; end if;

  select to_jsonb(d),d.user_id into v_before,v_user from public.driver_profiles d where d.id=p_driver_id for update;
  if v_before is null then raise exception 'Driver profile not found'; end if;

  update public.driver_profiles
  set status=case when p_action='approve' then 'approved' else 'rejected' end,
      profile_status=case when p_action='approve' then 'active' else 'rejected' end,
      verification_level=case when p_action='approve' then 'documents_checked' else verification_level end,
      review_reason=case when p_action='reject' then v_reason else null end,
      reviewed_by=auth.uid(),reviewed_at=now(),approved_at=case when p_action='approve' then now() else null end,
      published_at=case when p_action='approve' then coalesce(published_at,now()) else null end,updated_at=now()
  where id=p_driver_id returning to_jsonb(driver_profiles.*) into v_after;

  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(v_user,'driver_review',case when p_action='approve' then 'Driver profile approved' else 'Driver profile needs changes' end,
    case when p_action='approve' then 'Your LoadLink driver profile is approved and can now appear in the Driver marketplace.' else v_reason end,
    '/driver-profile','driver',p_driver_id,jsonb_build_object('status',case when p_action='approve' then 'approved' else 'rejected' end,'reason',v_reason));
  insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'driver.'||case when p_action='approve' then 'approved' else 'rejected' end,'driver',p_driver_id::text,v_before,v_after);
  perform public.loadlink_emit_event('driver.'||case when p_action='approve' then 'approved' else 'rejected' end,'driver',p_driver_id::text,jsonb_build_object('reason',v_reason));
  return jsonb_build_object('ok',true,'status',case when p_action='approve' then 'approved' else 'rejected' end,'driver_id',p_driver_id);
end;
$$;
revoke all on function public.loadlink_admin_review_driver(uuid,text,text) from public,anon;
grant execute on function public.loadlink_admin_review_driver(uuid,text,text) to authenticated;

drop policy if exists "LoadLink staff read driver documents" on storage.objects;
create policy "LoadLink staff read driver documents"
on storage.objects for select to authenticated
using (bucket_id='loadlink-driver-documents' and public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']));

create or replace function public.loadlink_finalize_paid_plan(
  p_payment_id uuid,p_reference text,p_provider_transaction_id text,p_amount_cents bigint,p_currency text
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
  request_id uuid;
  approved_request public.custom_package_requests%rowtype;
  expected_amount bigint;
begin
  select * into payment_row from public.admin_payments where id=p_payment_id for update;
  if payment_row.id is null then raise exception 'LoadLink payment record not found.'; end if;
  if payment_row.reference is distinct from p_reference then raise exception 'Payment reference mismatch.'; end if;
  if payment_row.package_type not in ('pro','dealer') then raise exception 'Invalid LoadLink plan.'; end if;

  select price_cents,currency,billing_interval into plan_price,plan_currency,plan_interval
  from public.subscription_plans where code=payment_row.package_type and is_active=true;
  if plan_price is null then raise exception 'This LoadLink plan is unavailable.'; end if;

  begin request_id:=nullif(payment_row.metadata->>'plan_request_id','')::uuid; exception when invalid_text_representation then request_id:=null; end;
  if request_id is not null then
    select * into approved_request from public.custom_package_requests
    where id=request_id and user_id=payment_row.user_id and recommended_plan=payment_row.package_type and status='approved';
  end if;
  expected_amount:=case when approved_request.id is not null then coalesce(approved_request.final_amount_cents,approved_request.estimated_amount_cents,plan_price)::bigint else plan_price end;

  if payment_row.amount_cents<>expected_amount or p_amount_cents<>expected_amount
     or upper(coalesce(p_currency,''))<>upper(coalesce(plan_currency,'ZAR'))
     or upper(coalesce(payment_row.currency,''))<>upper(coalesce(plan_currency,'ZAR')) then
    raise exception 'Payment amount does not match the approved LoadLink plan.';
  end if;

  if payment_row.status='paid' then
    return jsonb_build_object('ok',true,'already_processed',true,'plan',payment_row.package_type,
      'current_period_end',(select coalesce(s.current_period_end,s.ends_at,s.renews_at) from public.user_subscriptions s where s.user_id=payment_row.user_id and s.plan_code=payment_row.package_type order by s.created_at desc limit 1));
  end if;

  update public.admin_payments
  set status='paid',paid_at=coalesce(paid_at,now()),settled_at=coalesce(settled_at,now()),provider_transaction_id=nullif(p_provider_transaction_id,''),updated_at=now()
  where id=payment_row.id;

  select * into user_sub from public.user_subscriptions
  where user_id=payment_row.user_id and plan_code=payment_row.package_type
  order by created_at desc limit 1 for update;

  base_end:=greatest(now(),coalesce(user_sub.current_period_end,user_sub.ends_at,user_sub.renews_at,now()));
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
    set status='active',starts_at=coalesce(starts_at,now()),renews_at=period_end,ends_at=period_end,current_period_end=period_end,
        payment_id=payment_row.id,amount_cents=payment_row.amount_cents,currency=payment_row.currency,cancelled_at=null,suspension_reason=null,
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('provider','paystack','reference',payment_row.reference,'plan_request_id',request_id),updated_at=now()
    where id=user_sub.id;
  else
    insert into public.user_subscriptions(user_id,plan_code,status,starts_at,renews_at,ends_at,current_period_end,payment_id,amount_cents,currency,metadata)
    values(payment_row.user_id,payment_row.package_type,'active',now(),period_end,period_end,period_end,payment_row.id,payment_row.amount_cents,payment_row.currency,
      jsonb_build_object('provider','paystack','reference',payment_row.reference,'plan_request_id',request_id));
  end if;

  perform public.loadlink_sync_subscription_mirror(payment_row.user_id,payment_row.package_type);
  perform public.loadlink_recompute_profile_subscription(payment_row.user_id);

  if not exists(select 1 from public.billing_history where reference=payment_row.reference and user_id=payment_row.user_id) then
    insert into public.billing_history(user_id,payment_id,item_type,item_code,amount_cents,currency,status,reference)
    values(payment_row.user_id,payment_row.id,'subscription',payment_row.package_type,payment_row.amount_cents,payment_row.currency,'paid',payment_row.reference);
  end if;

  if not exists(select 1 from public.user_notifications where user_id=payment_row.user_id and type='plan_activated' and coalesce(metadata->>'reference','')=payment_row.reference) then
    insert into public.user_notifications(user_id,type,title,message,action_url,metadata)
    values(payment_row.user_id,'plan_activated','Your LoadLink plan is active',
      case when payment_row.package_type='dealer' then 'Congratulations. Your Dealer payment is active. Continue dealership setup and approval before publishing stock.' else 'Congratulations. Your Pro access is active. You can continue your vehicle listing now.' end,
      case when payment_row.package_type='dealer' then '/dealer' else '/list-your-vehicle?plan=pro&smart=1' end,
      jsonb_build_object('plan',payment_row.package_type,'reference',payment_row.reference,'plan_request_id',request_id));
  end if;

  return jsonb_build_object('ok',true,'already_processed',false,'plan',payment_row.package_type,'current_period_end',period_end);
end;
$$;
revoke all on function public.loadlink_finalize_paid_plan(uuid,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.loadlink_finalize_paid_plan(uuid,text,text,bigint,text) to service_role;
