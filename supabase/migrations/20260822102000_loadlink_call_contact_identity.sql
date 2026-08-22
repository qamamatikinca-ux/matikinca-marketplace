create or replace function public.loadlink_call_contact_identity(p_session_id uuid)
returns table(user_id uuid, full_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(nullif(trim(p.full_name), ''), 'LoadLink contact') as full_name,
    nullif(trim(p.avatar_url), '') as avatar_url
  from public.call_sessions s
  join public.profiles p
    on p.id = case
      when s.caller_user_id = auth.uid() then s.callee_user_id
      else s.caller_user_id
    end
  where s.id = p_session_id
    and auth.uid() is not null
    and auth.uid() in (s.caller_user_id, s.callee_user_id)
  limit 1;
$$;

revoke all on function public.loadlink_call_contact_identity(uuid) from public;
grant execute on function public.loadlink_call_contact_identity(uuid) to authenticated;
