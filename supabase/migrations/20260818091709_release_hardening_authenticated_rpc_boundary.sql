begin;

revoke execute on function public.is_loadlink_admin() from public, anon;
grant execute on function public.is_loadlink_admin() to authenticated;

revoke execute on function public.loadlink_accept_current_nda(text,text,text,jsonb) from public, anon;
grant execute on function public.loadlink_accept_current_nda(text,text,text,jsonb) to authenticated;

revoke execute on function public.loadlink_account_is_restricted(uuid) from public, anon;
grant execute on function public.loadlink_account_is_restricted(uuid) to authenticated;

revoke execute on function public.loadlink_account_status(uuid) from public, anon;
grant execute on function public.loadlink_account_status(uuid) to authenticated;

revoke execute on function public.loadlink_active_plan(uuid) from public, anon;
grant execute on function public.loadlink_active_plan(uuid) to authenticated;

revoke execute on function public.loadlink_create_dealer_status(jsonb) from public, anon;
grant execute on function public.loadlink_create_dealer_status(jsonb) to authenticated;

revoke execute on function public.loadlink_driver_contact(uuid) from public, anon;
grant execute on function public.loadlink_driver_contact(uuid) to authenticated;

revoke execute on function public.loadlink_generate_payment_reference() from public, anon;
grant execute on function public.loadlink_generate_payment_reference() to authenticated;

revoke execute on function public.loadlink_get_dealer_dashboard_summary() from public, anon;
grant execute on function public.loadlink_get_dealer_dashboard_summary() to authenticated;

revoke execute on function public.loadlink_get_dealer_entitlements() from public, anon;
grant execute on function public.loadlink_get_dealer_entitlements() to authenticated;

revoke execute on function public.loadlink_get_my_dealer_context() from public, anon;
grant execute on function public.loadlink_get_my_dealer_context() to authenticated;

revoke execute on function public.loadlink_get_my_intelligence_state() from public, anon;
grant execute on function public.loadlink_get_my_intelligence_state() to authenticated;

revoke execute on function public.loadlink_is_admin() from public, anon;
grant execute on function public.loadlink_is_admin() to authenticated;

revoke execute on function public.loadlink_is_staff(text[]) from public, anon;
grant execute on function public.loadlink_is_staff(text[]) to authenticated;

revoke execute on function public.loadlink_is_trusted_server() from public, anon;
grant execute on function public.loadlink_is_trusted_server() to authenticated;

revoke execute on function public.loadlink_log_dealer_activity(uuid,text,text,text,text,text,jsonb,jsonb) from public, anon;
grant execute on function public.loadlink_log_dealer_activity(uuid,text,text,text,text,text,jsonb,jsonb) to authenticated;

revoke execute on function public.loadlink_marketplace_is_restricted(uuid) from public, anon;
grant execute on function public.loadlink_marketplace_is_restricted(uuid) to authenticated;

revoke execute on function public.loadlink_user_has_dealer_subscription(uuid) from public, anon;
grant execute on function public.loadlink_user_has_dealer_subscription(uuid) to authenticated;

commit;
