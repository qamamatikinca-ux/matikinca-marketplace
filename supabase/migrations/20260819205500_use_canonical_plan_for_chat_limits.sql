create or replace function public.guest_chat_is_pro(p_access_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select auth.uid() is not null
    and coalesce(public.loadlink_active_plan(auth.uid()),'') in ('pro','dealer');
$$;

revoke all on function public.guest_chat_is_pro(text) from public, anon;
grant execute on function public.guest_chat_is_pro(text) to authenticated, service_role;
