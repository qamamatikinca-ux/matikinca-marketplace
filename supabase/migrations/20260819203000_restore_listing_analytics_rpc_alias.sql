create or replace function public.get_pro_job_analytics(p_job_id uuid, p_owner_key text)
returns jsonb
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  select public.get_job_analytics(p_job_id,p_owner_key);
$$;

revoke all on function public.get_pro_job_analytics(uuid,text) from public, anon;
grant execute on function public.get_pro_job_analytics(uuid,text) to authenticated;
