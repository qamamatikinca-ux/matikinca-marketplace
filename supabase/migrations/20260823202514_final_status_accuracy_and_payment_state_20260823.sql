create or replace function public.loadlink_my_payment_status(p_reference text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v public.admin_payments%rowtype;
begin
  if v_user is null then raise exception 'Sign in to view payment status.'; end if;
  select * into v from public.admin_payments where reference=btrim(coalesce(p_reference,'')) and user_id=v_user limit 1;
  if v.id is null then raise exception 'Payment not found on this account.'; end if;
  return jsonb_build_object(
    'id',v.id,
    'reference',v.reference,
    'status',v.status,
    'amount_cents',v.amount_cents,
    'currency',v.currency,
    'payment_type',v.payment_type,
    'package_type',v.package_type,
    'provider',v.provider,
    'paid_at',v.paid_at,
    'created_at',v.created_at,
    'reconciliation_status',v.reconciliation_status,
    'review_state',coalesce(v.metadata->>'review_state',case when v.status='paid' then 'approved' when v.status='received_pending_review' then 'pending' when v.status='review_rejected' then 'rejected' else null end),
    'review_reason',case when v.status='review_rejected' then coalesce(v.metadata->>'review_reason',v.notes) else null end
  );
end
$function$;
revoke all on function public.loadlink_my_payment_status(text) from public, anon;
grant execute on function public.loadlink_my_payment_status(text) to authenticated, service_role;

create or replace function public.loadlink_mark_followed_dealer_status_seen(p_status_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid:=auth.uid();
  v_dealer uuid;
begin
  if v_user is null or p_status_id is null then return false; end if;

  select ds.dealership_id into v_dealer
  from public.dealership_statuses ds
  join public.dealership_profiles dp on dp.id=ds.dealership_id
  where ds.id=p_status_id
    and ds.moderation_status='approved'
    and ds.publication_status='published'
    and ds.starts_at<=now()
    and ds.expires_at>now()
    and dp.verification_status='approved'
    and dp.is_public=true
    and coalesce(dp.platform_status,'active')='active'
    and coalesce(dp.showroom_status,'live')='live'
    and exists(
      select 1 from public.dealership_followers df
      where df.dealership_id=ds.dealership_id and df.user_id=v_user
    );

  if v_dealer is null then return false; end if;

  insert into public.dealership_status_views(
    status_id,viewer_user_id,viewer_hash,watch_seconds,completed,vehicle_opened,message_sent,viewed_at
  ) values (
    p_status_id,v_user,null,0,false,false,false,now()
  )
  on conflict (status_id,viewer_user_id) where viewer_user_id is not null
  do nothing;

  return true;
end
$function$;
revoke all on function public.loadlink_mark_followed_dealer_status_seen(uuid) from public, anon;
grant execute on function public.loadlink_mark_followed_dealer_status_seen(uuid) to authenticated, service_role;

create or replace function public.loadlink_dealer_analytics(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare c jsonb; d uuid; days int:=greatest(1,least(coalesce(p_days,30),365)); totals jsonb; sources jsonb; stock jsonb; people jsonb; daily jsonb; response jsonb; status_count bigint;
begin
  c:=public.loadlink_get_my_dealer_context(); d:=(c->>'dealership_id')::uuid;
  if not (c->'permissions' ? 'analytics.read') then raise exception 'You do not have Dealer analytics access'; end if;
  response:=public.loadlink_recalculate_dealer_response_metrics(d);
  select count(*) into status_count
  from public.dealership_status_views v join public.dealership_statuses s on s.id=v.status_id
  where s.dealership_id=d and v.viewed_at>=now()-make_interval(days=>days);

  select jsonb_build_object(
    'showroom_views',(select count(*) from public.dealership_profile_views where dealership_id=d and viewed_at>=now()-make_interval(days=>days)),
    'vehicle_views',coalesce(sum(a.views),0),
    'search_appearances',coalesce(sum(a.search_appearances),0),
    'saves',coalesce(sum(a.saves),0),
    'enquiries',coalesce(sum(a.chat_enquiries+a.whatsapp_clicks+a.phone_clicks),0),
    'leads',(select count(*) from public.dealership_leads where dealership_id=d and created_at>=now()-make_interval(days=>days)),
    'won',(select count(*) from public.dealership_leads where dealership_id=d and status='won' and updated_at>=now()-make_interval(days=>days)),
    'response_rate',coalesce((response->>'response_rate')::numeric,0),
    'avg_response_minutes',nullif(response->>'avg_response_minutes','')::numeric,
    'followers_gained',(select count(*) from public.dealership_followers where dealership_id=d and created_at>=now()-make_interval(days=>days)),
    'status_views',coalesce(status_count,0)
  ) into totals
  from public.job_listings j left join public.listing_analytics a on a.listing_id=j.id where j.dealership_id=d;

  select coalesce(jsonb_agg(jsonb_build_object('label',source,'value',n) order by n desc),'[]'::jsonb) into sources
  from (select coalesce(nullif(source,''),'Other') source,count(*) n from public.dealership_leads where dealership_id=d and created_at>=now()-make_interval(days=>days) group by 1) q;

  select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'views',views,'saves',saves,'leads',leads,'days_in_stock',days_in_stock) order by views desc,leads desc),'[]'::jsonb) into stock
  from (select j.id,j.title,coalesce(a.views,0) views,coalesce(a.saves,0) saves,(select count(*) from public.dealership_leads l where l.dealership_id=d and l.listing_id=j.id) leads,greatest(0,floor(extract(epoch from(now()-j.created_at))/86400))::int days_in_stock from public.job_listings j left join public.listing_analytics a on a.listing_id=j.id where j.dealership_id=d order by coalesce(a.views,0) desc limit 20) q;

  select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'name',name,'leads',leads,'contacted',contacted,'won',won,'response_minutes',null) order by won desc,leads desc),'[]'::jsonb) into people
  from (
    select s.user_id,coalesce(p.full_name,s.invited_email,'Dealer staff') name,
      count(l.id) leads,count(l.id) filter(where l.status<>'new') contacted,count(l.id) filter(where l.status='won') won
    from public.dealership_staff s left join public.profiles p on p.id=s.user_id left join public.dealership_leads l on l.dealership_id=d and l.assigned_to=s.user_id and l.created_at>=now()-make_interval(days=>days)
    where s.dealership_id=d and s.is_active=true and s.role in ('owner','manager','sales_agent') group by s.user_id,p.full_name,s.invited_email
  ) q;

  with dates as (select generate_series(current_date-(days-1),current_date,interval '1 day')::date dt)
  select coalesce(jsonb_agg(jsonb_build_object('date',dt::text,'views',views,'leads',leads,'status_views',status_views) order by dt),'[]'::jsonb) into daily
  from (select x.dt,
    coalesce((select sum(e.quantity) from public.dealership_analytics_events e where e.dealership_id=d and e.event_type='vehicle_view' and e.occurred_at>=x.dt and e.occurred_at<x.dt+1),0) views,
    coalesce((select count(*) from public.dealership_leads l where l.dealership_id=d and l.created_at>=x.dt and l.created_at<x.dt+1),0) leads,
    coalesce((select count(*) from public.dealership_status_views v join public.dealership_statuses s on s.id=v.status_id where s.dealership_id=d and v.viewed_at>=x.dt and v.viewed_at<x.dt+1),0) status_views
    from dates x) q;

  return jsonb_build_object('range_days',days,'totals',totals,'lead_sources',sources,'stock_performance',stock,'salesperson_performance',people,'daily',daily);
end
$function$;
