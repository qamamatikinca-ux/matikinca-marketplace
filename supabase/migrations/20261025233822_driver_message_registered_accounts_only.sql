-- Anonymous authenticated sessions are not registered marketplace accounts.
alter policy driver_threads_participant_read on public.driver_message_threads
using (coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false) is false and (select auth.uid()) in (driver_user_id,enquirer_user_id));
alter policy driver_messages_participant_read on public.driver_thread_messages
using (coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false) is false and exists(select 1 from public.driver_message_threads t where t.id=thread_id and (select auth.uid()) in (t.driver_user_id,t.enquirer_user_id)));
CREATE OR REPLACE FUNCTION public.loadlink_close_driver_chat(p_thread_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in required'; end if;
 update public.driver_message_threads set blocked=true,updated_at=now() where id=p_thread_id and auth.uid() in (driver_user_id,enquirer_user_id);
 if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
end; $function$;

CREATE OR REPLACE FUNCTION public.loadlink_driver_contact(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_profile public.driver_profiles;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to contact a driver' using errcode='28000'; end if;
  if exists(select 1 from public.user_moderation_profiles where user_id=auth.uid() and status in ('suspended','blocked')) then raise exception 'Account access is restricted' using errcode='42501'; end if;
  select * into v_profile from public.driver_profiles p where p.id=p_profile_id and p.status='approved'
    and (p.profile_expires_at is null or p.profile_expires_at>now())
    and not exists(select 1 from public.user_moderation_profiles m where m.user_id=p.user_id and m.status in ('suspended','blocked'));
  if not found then raise exception 'Driver profile is unavailable' using errcode='P0002'; end if;
  return jsonb_build_object('phone',v_profile.phone,'fullName',v_profile.full_name);
end; $function$;

CREATE OR REPLACE FUNCTION public.loadlink_open_driver_chat(p_profile_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p public.driver_profiles; v_id uuid; v_user uuid:=auth.uid(); v_name text;
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in required' using errcode='28000'; end if;
 if exists(select 1 from public.user_moderation_profiles where user_id=v_user and status in ('suspended','blocked')) then raise exception 'Account access is restricted' using errcode='42501'; end if;
 select * into p from public.driver_profiles where id=p_profile_id and status='approved' and (profile_expires_at is null or profile_expires_at>now());
 if not found or exists(select 1 from public.user_moderation_profiles where user_id=p.user_id and status in ('suspended','blocked')) then raise exception 'Driver profile unavailable' using errcode='P0002'; end if;
 if p.user_id=v_user then raise exception 'You cannot message yourself'; end if;
 -- Serialize per enquirer so the opening budget cannot race across instances.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text, 516));
 select id into v_id from public.driver_message_threads where driver_profile_id=p_profile_id and enquirer_user_id=v_user;
 if v_id is not null then return v_id; end if;
 if (select count(*) from public.driver_message_threads where enquirer_user_id=v_user and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before starting more conversations'; end if;
 select coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'LoadLink member') into v_name from auth.users where id=v_user;
 insert into public.driver_message_threads(driver_profile_id,driver_user_id,enquirer_user_id,driver_name,enquirer_name)
 values(p.id,p.user_id,v_user,p.full_name,left(v_name,140)) returning id into v_id;
 return v_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.loadlink_send_driver_message(p_thread_id uuid, p_body text, p_client_message_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare t public.driver_message_threads; v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into t from public.driver_message_threads where id=p_thread_id for update;
 if not found or v_user not in (t.driver_user_id,t.enquirer_user_id) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 select id into v_id from public.driver_thread_messages where sender_id=v_user and client_message_id=p_client_message_id and thread_id=t.id and body=trim(p_body);
 if v_id is not null then return v_id; end if;
 if t.blocked then raise exception 'This conversation is closed'; end if;
 if exists(select 1 from public.user_moderation_profiles where user_id in (t.driver_user_id,t.enquirer_user_id) and status in ('suspended','blocked')) then raise exception 'Account access is restricted' using errcode='42501'; end if;
 if not exists(select 1 from public.driver_profiles where id=t.driver_profile_id and user_id=t.driver_user_id and status='approved' and (profile_expires_at is null or profile_expires_at>now())) then raise exception 'Driver profile unavailable'; end if;
 if length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'Enter a message of up to 2000 characters'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,517));
 if (select count(*) from public.driver_thread_messages where sender_id=v_user and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait before sending another message'; end if;
 insert into public.driver_thread_messages(thread_id,sender_id,body,client_message_id) values(t.id,v_user,trim(p_body),p_client_message_id) returning id into v_id;
 update public.driver_message_threads set updated_at=now() where id=t.id;
 insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
 values(case when v_user=t.driver_user_id then t.enquirer_user_id else t.driver_user_id end,
 'driver_message','New driver message','You have a new LoadLink message about '||t.driver_name||'’s driver profile.',
 '/messages/drivers?thread='||t.id::text,'driver_message_thread',t.id,jsonb_build_object('thread_id',t.id,'driver_profile_id',t.driver_profile_id));
 return v_id;
end; $function$;

-- Account closure must not leave undeletable thread foreign keys.
alter table public.driver_message_threads drop constraint driver_message_threads_driver_profile_id_fkey;
alter table public.driver_message_threads add constraint driver_message_threads_driver_profile_id_fkey foreign key(driver_profile_id) references public.driver_profiles(id) on delete cascade;
alter table public.driver_message_threads drop constraint driver_message_threads_driver_user_id_fkey;
alter table public.driver_message_threads add constraint driver_message_threads_driver_user_id_fkey foreign key(driver_user_id) references auth.users(id) on delete cascade;
alter table public.driver_message_threads drop constraint driver_message_threads_enquirer_user_id_fkey;
alter table public.driver_message_threads add constraint driver_message_threads_enquirer_user_id_fkey foreign key(enquirer_user_id) references auth.users(id) on delete cascade;
alter table public.driver_thread_messages drop constraint driver_thread_messages_sender_id_fkey;
alter table public.driver_thread_messages add constraint driver_thread_messages_sender_id_fkey foreign key(sender_id) references auth.users(id) on delete cascade;

-- Bring existing approvals into the required portrait review process without deleting evidence.
with changed as (
 update public.driver_profiles p set
  status=case when exists(select 1 from public.driver_documents d where d.profile_id=p.id and d.document_type='portrait') then 'pending' else 'rejected' end,
  profile_status=case when exists(select 1 from public.driver_documents d where d.profile_id=p.id and d.document_type='portrait') then 'submitted' else 'rejected' end,
  review_reason='A clear profile photo and a fresh portrait-to-identity review are now required before your driver profile can be published.',
  missing_document_type=case when exists(select 1 from public.driver_documents d where d.profile_id=p.id and d.document_type='portrait') then null else 'portrait' end,
  approved_at=null,reviewed_at=null,reviewed_by=null,updated_at=now()
 where p.status='approved' and not exists(select 1 from private.driver_identity_matches m where m.profile_id=p.id)
 returning p.user_id,p.id
)
insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
select user_id,'driver_verification_update','Driver profile verification update',
 'Add a clear photo of yourself and resubmit your driver profile. It will appear publicly after the updated identity review.',
 '/driver-profile','driver',id,jsonb_build_object('reason','portrait_identity_review_required') from changed;
