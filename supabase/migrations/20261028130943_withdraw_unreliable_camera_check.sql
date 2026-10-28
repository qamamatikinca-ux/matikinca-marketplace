-- Withdraw unreliable camera capture without deleting submitted evidence.
revoke execute on function public.loadlink_start_live_check(text) from public, anon, authenticated;
revoke execute on function public.loadlink_finish_live_check(uuid,text,jsonb) from public, anon, authenticated;
drop policy if exists live_evidence_upload on storage.objects;
