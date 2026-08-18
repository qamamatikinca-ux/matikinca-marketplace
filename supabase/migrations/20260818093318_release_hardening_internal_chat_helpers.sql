begin;

revoke execute on function public.loadlink_chat_activity_visible(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_activity_visible_hash(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_key_hash(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_requests_enabled(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_requests_enabled_hash(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_typing_visible(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_typing_visible_hash(text) from public, anon, authenticated;
revoke execute on function public.loadlink_chat_user_id_from_hash(text) from public, anon, authenticated;
revoke execute on function public.loadlink_security_subject() from public, anon, authenticated;

commit;
