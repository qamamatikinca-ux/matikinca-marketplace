-- Sensitive billing/subscription state is mutated only by guarded RPCs/service flows.
revoke insert,update,delete on table public.loadlink_subscriptions from anon,authenticated;
revoke update,delete on table public.custom_package_requests from anon,authenticated;
revoke insert,update,delete on table public.admin_payments from anon,authenticated;
