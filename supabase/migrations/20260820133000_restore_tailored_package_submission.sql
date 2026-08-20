-- LoadLink final audit: restore the user-facing tailored package request workflow.

create or replace function public.loadlink_submit_tailored_package_request(
  p_listings integer,
  p_photos integer,
  p_analytics boolean default false,
  p_priority boolean default false,
  p_showroom boolean default false,
  p_team_seats integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  uid uuid:=auth.uid();
  v_listings integer:=greatest(1,least(coalesce(p_listings,1),500));
  v_photos integer:=greatest(5,least(coalesce(p_photos,5),15));
  v_seats integer:=greatest(1,least(coalesce(p_team_seats,1),100));
  v_plan text;
  v_price integer;
  v_existing public.custom_package_requests%rowtype;
  v_id uuid;
  v_features jsonb;
begin
  if uid is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if public.loadlink_account_is_restricted(uid) or public.loadlink_marketplace_is_restricted(uid) then raise exception 'This account cannot request a package right now.'; end if;

  v_plan:=case when coalesce(p_showroom,false) or v_seats>1 or v_listings>=10 then 'dealer' else 'pro' end;
  if v_plan='dealer' then v_photos:=greatest(v_photos,10); end if;

  select * into v_existing
  from public.custom_package_requests
  where user_id=uid and status='pending_review'
  order by created_at desc limit 1;
  if v_existing.id is not null then
    return jsonb_build_object('ok',true,'duplicate',true,'request_id',v_existing.id,'recommended_plan',v_existing.recommended_plan,'estimated_amount_cents',v_existing.estimated_amount_cents,'message','Your tailored package request is already under review.');
  end if;

  select price_cents::integer into v_price from public.subscription_plans where code=v_plan and is_active=true;
  if v_price is null then raise exception 'The recommended LoadLink plan is unavailable.'; end if;

  v_features:=jsonb_build_object(
    'listings',v_listings,
    'photos',v_photos,
    'analytics',coalesce(p_analytics,false),
    'priority',coalesce(p_priority,false),
    'showroom',coalesce(p_showroom,false),
    'teamSeats',v_seats
  );

  insert into public.custom_package_requests(user_id,requested_features,estimated_amount_cents,recommended_plan,status)
  values(uid,v_features,v_price,v_plan,'pending_review')
  returning id into v_id;

  insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
  values(uid,'plan_request_submitted','Tailored package sent to LoadLink',
    'Your tailored package request is now in the Control Centre review queue. LoadLink will confirm the final plan and monthly amount before payment.',
    '/packages','package_request',v_id,jsonb_build_object('status','pending_review','plan',v_plan,'estimate_cents',v_price));

  if to_regclass('public.admin_audit_trail') is not null then
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,after_data)
    values(uid,'package_request.tailored_submitted','package_request',v_id::text,jsonb_build_object('recommended_plan',v_plan,'estimated_amount_cents',v_price,'requested_features',v_features));
  end if;

  return jsonb_build_object('ok',true,'duplicate',false,'request_id',v_id,'recommended_plan',v_plan,'estimated_amount_cents',v_price,'message','Your tailored package request is now under review.');
end;
$$;
revoke all on function public.loadlink_submit_tailored_package_request(integer,integer,boolean,boolean,boolean,integer) from public,anon;
grant execute on function public.loadlink_submit_tailored_package_request(integer,integer,boolean,boolean,boolean,integer) to authenticated;
