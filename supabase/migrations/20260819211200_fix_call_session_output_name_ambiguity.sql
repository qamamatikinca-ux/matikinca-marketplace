create or replace function public.loadlink_start_call_session(p_conversation_id uuid,p_callee_user_id uuid)
returns table(session_id uuid,max_seconds integer,remaining_seconds integer,premium boolean,started_at timestamptz)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_caller uuid:=auth.uid();
  v_caller_plan text:='standard';
  v_callee_plan text:='standard';
  v_premium boolean:=false;
  v_used integer:=0;
  v_remaining integer:=1200;
  v_id uuid;
  v_started timestamptz;
begin
  if v_caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_conversation_id is null or p_callee_user_id is null or p_callee_user_id=v_caller then raise exception 'INVALID_CALL'; end if;
  v_caller_plan:=coalesce(public.loadlink_active_plan(v_caller),'standard');
  v_callee_plan:=coalesce(public.loadlink_active_plan(p_callee_user_id),'standard');
  if not exists(select 1 from public.profiles p where p.id=p_callee_user_id) then raise exception 'CALL_USER_NOT_FOUND'; end if;

  update public.call_sessions s
  set ended_at=least(now(),s.started_at+make_interval(secs=>s.max_seconds)),status='limit_reached',end_reason='server_limit'
  where s.conversation_id=p_conversation_id and s.status='active' and now()>=s.started_at+make_interval(secs=>s.max_seconds);

  if exists(select 1 from public.call_sessions s where s.conversation_id=p_conversation_id and s.status='active' and (s.caller_user_id in (v_caller,p_callee_user_id) or s.callee_user_id in (v_caller,p_callee_user_id))) then raise exception 'CALL_ALREADY_ACTIVE'; end if;
  v_premium:=v_caller_plan in ('pro','dealer') and v_callee_plan in ('pro','dealer');
  if v_premium then v_remaining:=7200;
  else
    select coalesce(sum(greatest(0,least(s.max_seconds,floor(extract(epoch from (coalesce(s.ended_at,now())-s.started_at)))::integer))),0)::integer into v_used
    from public.call_sessions s where s.conversation_id=p_conversation_id and s.started_at>=date_trunc('day',now()) and s.status in ('active','ended','limit_reached');
    v_remaining:=greatest(0,1200-v_used);if v_remaining<=0 then raise exception 'CALL_LIMIT_REACHED'; end if;
  end if;
  insert into public.call_sessions(conversation_id,caller_user_id,callee_user_id,plan_at_start,max_seconds)
  values(p_conversation_id,v_caller,p_callee_user_id,case when v_premium then 'pro' else 'standard' end,v_remaining)
  returning id,call_sessions.started_at into v_id,v_started;
  return query select v_id,v_remaining,v_remaining,v_premium,v_started;
end;
$$;
revoke all on function public.loadlink_start_call_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.loadlink_start_call_session(uuid,uuid) to service_role;
