-- LoadLink final audit: make marketplace listing reports persistent and reviewable.

create or replace function public.loadlink_report_listing(
  p_listing_id uuid,
  p_category text default 'other',
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_reporter uuid := auth.uid();
  v_reported uuid;
  v_category text := lower(trim(coalesce(p_category,'other')));
  v_details text := trim(coalesce(p_details,''));
  v_existing uuid;
  v_id uuid;
begin
  if v_reporter is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if v_category not in ('suspected_scam','incorrect_information','no_longer_available','duplicate','misleading_price','inappropriate','other') then
    v_category := 'other';
  end if;
  if length(v_details) < 3 then raise exception 'Add a short reason for the report'; end if;
  if length(v_details) > 2000 then v_details := left(v_details,2000); end if;

  select user_id into v_reported
  from public.job_listings
  where id=p_listing_id
    and coalesce(status,'active') not in ('deleted','removed')
  limit 1;
  if not found then raise exception 'Listing not found'; end if;
  if v_reported is not null and v_reported=v_reporter then raise exception 'You cannot report your own listing'; end if;

  select id into v_existing
  from public.user_reports
  where reporter_user_id=v_reporter
    and listing_id=p_listing_id
    and status in ('open','reviewing')
    and created_at > now()-interval '30 minutes'
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('ok',true,'duplicate',true,'report_id',v_existing);
  end if;

  insert into public.user_reports(reported_user_id,reporter_user_id,listing_id,category,details,status)
  values(v_reported,v_reporter,p_listing_id,v_category,v_details,'open')
  returning id into v_id;

  if to_regclass('public.admin_audit_trail') is not null then
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,after_data)
    values(v_reporter,'listing.reported','listing',p_listing_id::text,jsonb_build_object('report_id',v_id,'category',v_category));
  end if;

  return jsonb_build_object('ok',true,'duplicate',false,'report_id',v_id);
end;
$$;

revoke all on function public.loadlink_report_listing(uuid,text,text) from public, anon;
grant execute on function public.loadlink_report_listing(uuid,text,text) to authenticated;

create or replace function public.loadlink_admin_report_queue(
  p_status text default 'open',
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['support','moderator','operations','admin','owner']) then
    raise exception 'Admin permission required';
  end if;
  if coalesce(p_status,'open') not in ('all','open','reviewing','resolved','dismissed') then
    raise exception 'Invalid report status';
  end if;

  return query
  select jsonb_build_object(
    'id',r.id,
    'listing_id',r.listing_id,
    'listing_title',j.title,
    'listing_city',j.city,
    'reported_user_id',r.reported_user_id,
    'reported_name',coalesce(nullif(trim(rp.full_name),''),nullif(trim(rp.company_name),''),'LoadLink member'),
    'reporter_user_id',r.reporter_user_id,
    'reporter_name',coalesce(nullif(trim(pp.full_name),''),nullif(trim(pp.company_name),''),'LoadLink member'),
    'category',r.category,
    'details',r.details,
    'status',r.status,
    'assigned_to',r.assigned_to,
    'resolution_notes',r.resolution_notes,
    'created_at',r.created_at,
    'resolved_at',r.resolved_at
  )
  from public.user_reports r
  left join public.job_listings j on j.id=r.listing_id
  left join public.profiles rp on rp.id=r.reported_user_id
  left join public.profiles pp on pp.id=r.reporter_user_id
  where coalesce(p_status,'open')='all' or r.status=coalesce(p_status,'open')
  order by case r.status when 'open' then 0 when 'reviewing' then 1 else 2 end, r.created_at asc
  limit greatest(1,least(coalesce(p_limit,100),200))
  offset greatest(coalesce(p_offset,0),0);
end;
$$;

revoke all on function public.loadlink_admin_report_queue(text,integer,integer) from public, anon;
grant execute on function public.loadlink_admin_report_queue(text,integer,integer) to authenticated;

create or replace function public.loadlink_admin_review_report(
  p_report_id uuid,
  p_action text,
  p_resolution_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_action text := lower(trim(coalesce(p_action,'')));
  v_notes text := trim(coalesce(p_resolution_notes,''));
  v_row public.user_reports%rowtype;
begin
  if not public.loadlink_is_staff(array['support','moderator','operations','admin','owner']) then
    raise exception 'Admin permission required';
  end if;
  if v_action not in ('reviewing','resolved','dismissed') then raise exception 'Invalid report action'; end if;
  if v_action in ('resolved','dismissed') and length(v_notes)<5 then raise exception 'Add a clear resolution note'; end if;

  select * into v_row from public.user_reports where id=p_report_id for update;
  if not found then raise exception 'Report not found'; end if;

  update public.user_reports
  set status=v_action,
      assigned_to=auth.uid(),
      resolution_notes=case when v_action='reviewing' then resolution_notes else v_notes end,
      resolved_at=case when v_action in ('resolved','dismissed') then now() else null end
  where id=p_report_id;

  if to_regclass('public.user_notifications') is not null and v_row.reporter_user_id is not null and v_action in ('resolved','dismissed') then
    insert into public.user_notifications(user_id,type,title,message,action_url,metadata)
    values(
      v_row.reporter_user_id,
      'report_review',
      case when v_action='resolved' then 'Report reviewed' else 'Report closed' end,
      case when v_action='resolved' then 'LoadLink reviewed the listing report you submitted.' else 'LoadLink reviewed your report and closed the case.' end,
      case when v_row.listing_id is not null then '/listing/'||v_row.listing_id::text else '/notifications' end,
      jsonb_build_object('report_id',p_report_id,'status',v_action)
    );
  end if;

  if to_regclass('public.admin_audit_trail') is not null then
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'report.'||v_action,'user_report',p_report_id::text,to_jsonb(v_row),jsonb_build_object('status',v_action,'resolution_notes',nullif(v_notes,'')));
  end if;

  return jsonb_build_object('ok',true,'status',v_action);
end;
$$;

revoke all on function public.loadlink_admin_review_report(uuid,text,text) from public, anon;
grant execute on function public.loadlink_admin_review_report(uuid,text,text) to authenticated;

drop policy if exists user_reports_staff_update on public.user_reports;
create policy user_reports_staff_update on public.user_reports
for update to authenticated
using (public.loadlink_is_staff(array['support','moderator','operations','admin','owner']))
with check (public.loadlink_is_staff(array['support','moderator','operations','admin','owner']));
