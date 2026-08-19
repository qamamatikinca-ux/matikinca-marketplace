create or replace function public.record_job_view(
  p_job_id uuid,
  p_viewer_key text,
  p_device_type text default 'unknown',
  p_source text default 'direct'
)
returns boolean
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $$
declare
  v_owner_key text;
  v_owner_user_id uuid;
  v_viewer_user_id uuid := auth.uid();
  v_viewer_hash text;
  v_already_recorded boolean;
  v_device text;
  v_source text;
begin
  select j.owner_key,j.user_id
    into v_owner_key,v_owner_user_id
  from public.job_listings j
  where j.id=p_job_id
    and coalesce(j.status,'active')='active'
    and coalesce(j.moderation_status,'pending')='approved'
    and (j.expires_at is null or j.expires_at>now())
    and coalesce(j.stock_status,'available')<>'removed';

  if not found then return false; end if;
  if char_length(coalesce(p_viewer_key,''))<16 then return false; end if;
  if v_viewer_user_id is not null and v_owner_user_id=v_viewer_user_id then return false; end if;
  if nullif(v_owner_key,'') is not null and v_owner_key=p_viewer_key then return false; end if;

  v_viewer_hash:=encode(digest(p_viewer_key,'sha256'),'hex');
  v_device:=case when p_device_type in ('mobile','tablet','desktop') then p_device_type else 'unknown' end;
  v_source:=case when p_source in ('direct','google','social','whatsapp','loadlink','referral') then p_source else 'other' end;

  perform pg_advisory_xact_lock(hashtextextended(p_job_id::text||':'||v_viewer_hash,0));

  select exists(
    select 1 from public.job_view_events e
    where e.job_id=p_job_id
      and e.viewer_hash=v_viewer_hash
      and e.viewed_at>now()-interval '30 minutes'
  ) into v_already_recorded;

  if v_already_recorded then return false; end if;

  insert into public.job_view_events(job_id,viewer_hash,device_type,source,viewer_user_id)
  values(p_job_id,v_viewer_hash,v_device,v_source,v_viewer_user_id);

  update public.job_listings
  set view_count=coalesce(view_count,0)+1,last_viewed_at=now()
  where id=p_job_id;

  return true;
end;
$$;

grant execute on function public.record_job_view(uuid,text,text,text) to anon, authenticated;

create or replace function public.increment_job_view(p_job_id uuid,p_viewer_key text)
returns boolean
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  select public.record_job_view(p_job_id,p_viewer_key,'unknown','direct');
$$;

grant execute on function public.increment_job_view(uuid,text) to anon,authenticated;
