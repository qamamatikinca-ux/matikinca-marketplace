update public.loadlink_nda_settings
set enforcement_enabled=false, updated_at=now()
where singleton=true;

revoke all on function public.loadlink_accept_current_nda(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.loadlink_record_nda_decline(jsonb) from public, anon, authenticated;
revoke all on function public.loadlink_admin_nda_dashboard(text) from public, anon, authenticated;
revoke all on function public.loadlink_admin_publish_nda(text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.loadlink_admin_set_nda_enforcement(boolean) from public, anon, authenticated;

grant execute on function public.loadlink_accept_current_nda(text,text,text,jsonb) to service_role;
grant execute on function public.loadlink_record_nda_decline(jsonb) to service_role;
grant execute on function public.loadlink_admin_nda_dashboard(text) to service_role;
grant execute on function public.loadlink_admin_publish_nda(text,text,text,text,timestamptz) to service_role;
grant execute on function public.loadlink_admin_set_nda_enforcement(boolean) to service_role;
