create or replace function public.loadlink_start_call_session(p_conversation_id uuid, p_callee_user_id uuid)
returns table(session_id uuid, max_seconds integer, remaining_seconds integer, premium boolean, started_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_caller uuid := auth.uid();
  v_caller_plan text := 'standard';
  v_premium boolean := false;
  v_limit integer := 900;
  v_id uuid;
  v_started timestamptz;
begin
  if v_caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_conversation_id is null or p_callee_user_id is null or p_callee_user_id = v_caller then raise exception 'INVALID_CALL'; end if;

  v_caller_plan := coalesce(public.loadlink_active_plan(v_caller),'standard');
  if not exists(select 1 from public.profiles p where p.id = p_callee_user_id) then raise exception 'CALL_USER_NOT_FOUND'; end if;

  update public.call_sessions s
     set ended_at = least(now(), s.started_at + make_interval(secs => s.max_seconds)),
         status = 'limit_reached',
         end_reason = 'server_limit'
   where s.conversation_id = p_conversation_id
     and s.status = 'active'
     and s.plan_at_start not in ('pro','dealer')
     and now() >= s.started_at + make_interval(secs => s.max_seconds);

  if exists(
    select 1 from public.call_sessions s
    where s.conversation_id = p_conversation_id
      and s.status = 'active'
      and (s.caller_user_id in (v_caller,p_callee_user_id) or s.callee_user_id in (v_caller,p_callee_user_id))
  ) then raise exception 'CALL_ALREADY_ACTIVE'; end if;

  v_premium := v_caller_plan in ('pro','dealer');
  v_limit := case when v_premium then 14400 else 900 end;

  insert into public.call_sessions(conversation_id,caller_user_id,callee_user_id,plan_at_start,max_seconds)
  values(p_conversation_id,v_caller,p_callee_user_id,case when v_premium then v_caller_plan else 'standard' end,v_limit)
  returning id,call_sessions.started_at into v_id,v_started;

  return query select v_id,v_limit,v_limit,v_premium,v_started;
end;
$function$;

create or replace function public.loadlink_end_call_session(p_session_id uuid, p_reason text default 'ended'::text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.call_sessions;
  v_premium boolean;
begin
  select * into v_row from public.call_sessions where id = p_session_id for update;
  if not found then return; end if;
  if auth.uid() is null or auth.uid() not in (v_row.caller_user_id, v_row.callee_user_id) then raise exception 'CALL_FORBIDDEN'; end if;
  if v_row.status <> 'active' then return; end if;

  v_premium := coalesce(v_row.plan_at_start,'standard') in ('pro','dealer');
  if v_premium then
    update public.call_sessions
       set ended_at = now(),
           last_heartbeat_at = now(),
           status = 'ended',
           end_reason = left(coalesce(nullif(trim(p_reason),''),'ended'),80)
     where id = p_session_id;
  else
    update public.call_sessions
       set ended_at = least(now(), started_at + make_interval(secs => max_seconds)),
           last_heartbeat_at = now(),
           status = case when now() >= started_at + make_interval(secs => max_seconds) then 'limit_reached' else 'ended' end,
           end_reason = left(coalesce(nullif(trim(p_reason),''),'ended'),80)
     where id = p_session_id;
  end if;
end;
$function$;
