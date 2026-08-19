revoke all on function public.loadlink_phase2_enqueue_notification(uuid,text,text,text,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.loadlink_phase2_enqueue_notification(uuid,text,text,text,text,text,uuid,text,jsonb) to service_role;

revoke all on function public.loadlink_recalculate_dealer_response_metrics(uuid) from public, anon, authenticated;
grant execute on function public.loadlink_recalculate_dealer_response_metrics(uuid) to service_role;
