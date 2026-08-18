begin;

revoke execute on function public.loadlink_access_guard_state() from public, anon;
grant execute on function public.loadlink_access_guard_state() to authenticated;

revoke execute on function public.loadlink_access_state() from public, anon;
grant execute on function public.loadlink_access_state() to authenticated;

revoke execute on function public.loadlink_marketplace_capabilities() from public, anon;
grant execute on function public.loadlink_marketplace_capabilities() to authenticated;

revoke execute on function public.loadlink_require_platform_access() from public, anon;
grant execute on function public.loadlink_require_platform_access() to authenticated;

commit;
