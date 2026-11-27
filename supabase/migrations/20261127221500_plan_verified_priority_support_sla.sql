-- Priority support must be based on the authenticated user's active paid plan,
-- not on a priority value self-selected in a customer request.
-- Preserve staff-originated urgent escalations and existing SLA handling.
create or replace function public.loadlink_case_set_initial_sla()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.requester_user_id is not null and auth.uid()=new.requester_user_id then
  new.priority:=case
   when coalesce(public.loadlink_active_plan(new.requester_user_id),'standard') in ('pro','dealer')
   then 'high' else 'normal' end;
 end if;
 if new.due_at is null then
  new.due_at:=now()+case new.priority
   when 'urgent' then interval '2 hours'
   when 'high' then interval '8 hours'
   when 'low' then interval '72 hours'
   else interval '24 hours'
  end;
 end if;
 return new;
end
$$;
