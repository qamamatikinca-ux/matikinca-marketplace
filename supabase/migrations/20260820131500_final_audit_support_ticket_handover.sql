-- LoadLink final audit: turn Talk to agent into a real support-ticket handover.

create or replace function public.loadlink_create_support_ticket(
  p_subject text,
  p_description text,
  p_related_entity_type text default null,
  p_related_entity_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_user uuid := auth.uid();
  v_subject text := trim(coalesce(p_subject,''));
  v_description text := trim(coalesce(p_description,''));
  v_id uuid;
  v_number text;
begin
  if v_user is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if length(v_subject)<3 then raise exception 'Add a short support subject'; end if;
  if length(v_description)<10 then raise exception 'Add enough detail for LoadLink support to investigate'; end if;
  if length(v_subject)>160 then v_subject:=left(v_subject,160); end if;
  if length(v_description)>5000 then v_description:=left(v_description,5000); end if;
  if to_regprocedure('public.loadlink_enforce_rate_limit(text,integer,integer)') is not null then
    perform public.loadlink_enforce_rate_limit('support:create',5,3600);
  end if;

  insert into public.support_tickets(requester_user_id,subject,description,related_entity_type,related_entity_id,status,priority)
  values(v_user,v_subject,v_description,nullif(trim(coalesce(p_related_entity_type,'')),''),nullif(trim(coalesce(p_related_entity_id,'')),''),'open','normal')
  returning id,ticket_number into v_id,v_number;

  if to_regclass('public.admin_audit_trail') is not null then
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,after_data)
    values(v_user,'support.ticket_created','support_ticket',v_id::text,jsonb_build_object('ticket_number',v_number,'subject',v_subject));
  end if;

  return jsonb_build_object('ok',true,'ticket_id',v_id,'ticket_number',v_number,'status','open');
end;
$$;
revoke all on function public.loadlink_create_support_ticket(text,text,text,text) from public,anon;
grant execute on function public.loadlink_create_support_ticket(text,text,text,text) to authenticated;

create or replace function public.loadlink_admin_support_ticket_queue(
  p_status text default 'open',
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['support','operations','admin','owner']) then raise exception 'Support permission required'; end if;
  if coalesce(p_status,'open') not in ('all','open','in_progress','resolved','closed') then raise exception 'Invalid ticket status'; end if;
  return query
  select jsonb_build_object(
    'id',t.id,'ticket_number',t.ticket_number,'requester_user_id',t.requester_user_id,
    'requester_name',coalesce(nullif(trim(p.full_name),''),nullif(trim(p.company_name),''),'LoadLink member'),
    'requester_email',u.email,'subject',t.subject,'description',t.description,
    'related_entity_type',t.related_entity_type,'related_entity_id',t.related_entity_id,
    'status',t.status,'priority',t.priority,'assigned_user_id',t.assigned_user_id,
    'created_at',t.created_at,'updated_at',t.updated_at
  )
  from public.support_tickets t
  left join public.profiles p on p.id=t.requester_user_id
  left join auth.users u on u.id=t.requester_user_id
  where coalesce(p_status,'open')='all' or t.status=coalesce(p_status,'open')
  order by case t.status when 'open' then 0 when 'in_progress' then 1 else 2 end,t.created_at asc
  limit greatest(1,least(coalesce(p_limit,100),200)) offset greatest(coalesce(p_offset,0),0);
end;
$$;
revoke all on function public.loadlink_admin_support_ticket_queue(text,integer,integer) from public,anon;
grant execute on function public.loadlink_admin_support_ticket_queue(text,integer,integer) to authenticated;

create or replace function public.loadlink_admin_review_support_ticket(
  p_ticket_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_action text:=lower(trim(coalesce(p_action,'')));
  v_note text:=trim(coalesce(p_note,''));
  v_row public.support_tickets%rowtype;
begin
  if not public.loadlink_is_staff(array['support','operations','admin','owner']) then raise exception 'Support permission required'; end if;
  if v_action not in ('in_progress','resolved','closed') then raise exception 'Invalid ticket action'; end if;
  if v_action in ('resolved','closed') and length(v_note)<5 then raise exception 'Add a clear outcome note'; end if;
  select * into v_row from public.support_tickets where id=p_ticket_id for update;
  if not found then raise exception 'Support ticket not found'; end if;

  update public.support_tickets
  set status=v_action,assigned_user_id=auth.uid(),updated_at=now(),
      description=case when v_action in ('resolved','closed') then description||E'\n\nLoadLink support outcome: '||v_note else description end
  where id=p_ticket_id;

  if to_regclass('public.user_notifications') is not null and v_row.requester_user_id is not null then
    insert into public.user_notifications(user_id,type,title,message,action_url,metadata)
    values(v_row.requester_user_id,'support_ticket',
      case when v_action='in_progress' then 'LoadLink support is reviewing your request' when v_action='resolved' then 'Your LoadLink support request was resolved' else 'Your LoadLink support request was closed' end,
      case when v_action='in_progress' then 'Your support ticket '||v_row.ticket_number||' is now being reviewed.' else v_note end,
      '/notifications',jsonb_build_object('ticket_id',p_ticket_id,'ticket_number',v_row.ticket_number,'status',v_action));
  end if;

  if to_regclass('public.admin_audit_trail') is not null then
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'support.'||v_action,'support_ticket',p_ticket_id::text,to_jsonb(v_row),jsonb_build_object('status',v_action,'note',nullif(v_note,'')));
  end if;
  return jsonb_build_object('ok',true,'status',v_action,'ticket_number',v_row.ticket_number);
end;
$$;
revoke all on function public.loadlink_admin_review_support_ticket(uuid,text,text) from public,anon;
grant execute on function public.loadlink_admin_review_support_ticket(uuid,text,text) to authenticated;

drop policy if exists support_tickets_staff_all on public.support_tickets;
create policy support_tickets_staff_all on public.support_tickets for all to authenticated
using (public.loadlink_is_staff(array['support','operations','admin','owner']))
with check (public.loadlink_is_staff(array['support','operations','admin','owner']));
