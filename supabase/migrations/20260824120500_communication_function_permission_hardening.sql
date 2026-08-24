-- Restrict communication RPC execution to authenticated LoadLink sessions.
-- Internal authorization remains enforced by each function.

revoke execute on function public.loadlink_can_manage_communications() from public, anon;
revoke execute on function public.loadlink_communication_targets_current_user(text) from public, anon;
revoke execute on function public.loadlink_admin_communication_audience_counts() from public, anon;
revoke execute on function public.loadlink_my_active_communications() from public, anon;

grant execute on function public.loadlink_can_manage_communications() to authenticated;
grant execute on function public.loadlink_communication_targets_current_user(text) to authenticated;
grant execute on function public.loadlink_admin_communication_audience_counts() to authenticated;
grant execute on function public.loadlink_my_active_communications() to authenticated;
