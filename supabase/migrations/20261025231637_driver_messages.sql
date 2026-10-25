create table public.driver_message_threads (
 id uuid primary key default gen_random_uuid(), driver_profile_id uuid not null references public.driver_profiles(id),
 driver_user_id uuid not null references auth.users(id), enquirer_user_id uuid not null references auth.users(id),
 driver_name text not null, enquirer_name text not null, blocked boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(driver_profile_id,enquirer_user_id), check(driver_user_id<>enquirer_user_id)
);
create table public.driver_thread_messages (
 id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.driver_message_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id), client_message_id uuid not null, body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now(), unique(sender_id,client_message_id)
);
create index driver_message_threads_driver_idx on public.driver_message_threads(driver_user_id,updated_at desc);
create index driver_message_threads_enquirer_idx on public.driver_message_threads(enquirer_user_id,updated_at desc);
create index driver_thread_messages_order_idx on public.driver_thread_messages(thread_id,created_at desc,id desc);
create index driver_thread_messages_sender_idx on public.driver_thread_messages(sender_id,created_at desc);
alter table public.driver_message_threads enable row level security;
alter table public.driver_thread_messages enable row level security;
revoke all on public.driver_message_threads,public.driver_thread_messages from authenticated;
grant select on public.driver_message_threads,public.driver_thread_messages to authenticated;
revoke all on public.driver_message_threads,public.driver_thread_messages from anon;
create policy driver_threads_participant_read on public.driver_message_threads for select to authenticated
 using ((select auth.uid()) in (driver_user_id,enquirer_user_id));
create policy driver_messages_participant_read on public.driver_thread_messages for select to authenticated
 using (exists(select 1 from public.driver_message_threads t where t.id=thread_id and (select auth.uid()) in (t.driver_user_id,t.enquirer_user_id)));

create or replace function public.loadlink_open_driver_chat(p_profile_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.driver_profiles; v_id uuid; v_user uuid:=auth.uid(); v_name text;
begin
 if v_user is null then raise exception 'Sign in required' using errcode='28000'; end if;
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
end; $$;
revoke all on function public.loadlink_open_driver_chat(uuid) from public,anon;
grant execute on function public.loadlink_open_driver_chat(uuid) to authenticated;

create or replace function public.loadlink_send_driver_message(p_thread_id uuid,p_body text,p_client_message_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.driver_message_threads; v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Sign in required' using errcode='28000'; end if;
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
end; $$;
revoke all on function public.loadlink_send_driver_message(uuid,text,uuid) from public,anon;
grant execute on function public.loadlink_send_driver_message(uuid,text,uuid) to authenticated;

create or replace function public.loadlink_close_driver_chat(p_thread_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update public.driver_message_threads set blocked=true,updated_at=now() where id=p_thread_id and auth.uid() in (driver_user_id,enquirer_user_id);
 if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
end; $$;
revoke all on function public.loadlink_close_driver_chat(uuid) from public,anon;
grant execute on function public.loadlink_close_driver_chat(uuid) to authenticated;
