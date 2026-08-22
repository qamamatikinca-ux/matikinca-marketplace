-- Keep Manual credit balances private to signed-in account owners.
revoke execute on function public.loadlink_get_manual_credit_balance() from public, anon;
grant execute on function public.loadlink_get_manual_credit_balance() to authenticated, service_role;
