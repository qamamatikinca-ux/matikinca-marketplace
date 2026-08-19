create or replace function public.loadlink_get_vehicle_listing_access()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s jsonb;
  v_user uuid := auth.uid();
  v_access record;
  v_active_manual integer := 0;
begin
  s := public.loadlink_get_my_intelligence_state();

  if coalesce((s->'capabilities'->>'can_post_vehicle')::boolean, false) then
    return jsonb_build_object(
      'allowed',true,'plan',case when s->>'plan' in ('pro','dealer') then s->>'plan' else null end,
      'source',case when s->>'plan' in ('pro','dealer') then 'subscription' else null end,
      'subscription_status',s->>'plan_state','expires_at',s->>'current_period_end','access_period_id',null,
      'photo_limit',coalesce((s->'capabilities'->>'image_limit')::int,5),'daily_message_limit',null,
      'analytics_enabled',coalesce((s->'capabilities'->>'analytics')::boolean,false),
      'featured_enabled',s->>'plan' in ('pro','dealer'),'schema_ready',true
    );
  end if;

  if v_user is null then
    return jsonb_build_object('allowed',false,'plan',null,'source',null,'subscription_status',null,'expires_at',null,'access_period_id',null,'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false,'reason','Sign in to list a vehicle.','schema_ready',true);
  end if;

  select count(*)::int into v_active_manual from public.job_listings jl
  where jl.user_id=v_user and jl.listing_kind='vehicle' and jl.package_type='manual' and jl.expires_at is not null and jl.expires_at>now()
    and coalesce(lower(jl.lifecycle_status),'') not in ('expired','archived')
    and coalesce(lower(jl.status),'') not in ('sold','closed','deleted','archived','expired','rejected');

  if v_active_manual>=5 then
    return jsonb_build_object('allowed',false,'plan','manual','source','manual','subscription_status',null,'expires_at',null,'access_period_id',null,'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false,'active_manual_listings',v_active_manual,'manual_listing_limit',5,'reason','Manual allows up to 5 active vehicle listings at once.','schema_ready',true);
  end if;

  select lap.id,lap.expires_at into v_access from public.listing_access_periods lap
  where lap.user_id=v_user and lap.consumed_at is null and lap.starts_at<=now() and lap.expires_at>now()
  order by lap.expires_at asc,lap.created_at asc limit 1;

  if v_access.id is not null then
    return jsonb_build_object('allowed',true,'plan','manual','source','manual','subscription_status',null,'expires_at',v_access.expires_at,'access_period_id',v_access.id,'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false,'active_manual_listings',v_active_manual,'manual_listing_limit',5,'reason','Paid Manual access is ready to use.','schema_ready',true);
  end if;

  return jsonb_build_object('allowed',false,'plan',null,'source',null,'subscription_status',null,'expires_at',null,'access_period_id',null,'photo_limit',5,'daily_message_limit',50,'analytics_enabled',false,'featured_enabled',false,'active_manual_listings',v_active_manual,'manual_listing_limit',5,'reason','Choose Manual, Pro or Dealer to list a vehicle.','schema_ready',true);
end;
$$;
