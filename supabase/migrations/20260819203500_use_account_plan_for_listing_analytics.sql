create or replace function public.get_job_analytics(p_job_id uuid, p_owner_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  listing_record public.job_listings%rowtype;
  result jsonb;
  v_plan text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into listing_record
  from public.job_listings
  where id=p_job_id and user_id=auth.uid();

  if listing_record.id is null then
    raise exception 'Listing not found or not owned by this account';
  end if;

  v_plan := public.loadlink_active_plan(auth.uid());
  if coalesce(v_plan,'') not in ('pro','dealer') then
    raise exception 'Pro or dealership analytics required';
  end if;

  select jsonb_build_object(
    'total_views',coalesce(listing_record.view_count,0),
    'unique_viewers',(select count(distinct viewer_hash) from public.job_view_events where job_id=p_job_id),
    'last_viewed_at',listing_record.last_viewed_at,
    'daily_views',(
      select coalesce(jsonb_agg(jsonb_build_object('label',to_char(day_value,'Dy'),'count',view_total) order by day_value),'[]'::jsonb)
      from (
        select day_value,
          (select count(*) from public.job_view_events e where e.job_id=p_job_id and e.viewed_at>=day_value and e.viewed_at<day_value+interval '1 day') as view_total
        from generate_series(date_trunc('day',now())-interval '6 days',date_trunc('day',now()),interval '1 day') as days(day_value)
      ) daily
    ),
    'devices',(
      select coalesce(jsonb_agg(jsonb_build_object('label',device_type,'count',total) order by total desc),'[]'::jsonb)
      from (select device_type,count(*) total from public.job_view_events where job_id=p_job_id group by device_type) d
    ),
    'sources',(
      select coalesce(jsonb_agg(jsonb_build_object('label',source,'count',total) order by total desc),'[]'::jsonb)
      from (select source,count(*) total from public.job_view_events where job_id=p_job_id group by source) s
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_job_analytics(uuid,text) from public, anon;
grant execute on function public.get_job_analytics(uuid,text) to authenticated;
