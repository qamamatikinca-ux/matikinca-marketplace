-- LoadLink private messaging and Pro analytics. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

alter table public.profiles add column if not exists subscription_plan text not null default 'standard';
alter table public.profiles add column if not exists last_seen timestamptz default now();

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.job_listings(id) on delete set null,
  listing_title text not null default 'LoadLink listing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'LoadLink user',
  phone text,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  file_path text,
  file_name text,
  file_type text,
  created_at timestamptz not null default now(),
  check (char_length(body) <= 4000)
);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id,created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.is_chat_participant(p_conversation uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.chat_participants where conversation_id=p_conversation and user_id=auth.uid());
$$;

drop policy if exists "participants read conversations" on public.chat_conversations;
create policy "participants read conversations" on public.chat_conversations for select using (public.is_chat_participant(id));
drop policy if exists "participants read participants" on public.chat_participants;
create policy "participants read participants" on public.chat_participants for select using (public.is_chat_participant(conversation_id));
drop policy if exists "participants read messages" on public.chat_messages;
create policy "participants read messages" on public.chat_messages for select using (public.is_chat_participant(conversation_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-attachments','chat-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=10485760;

drop policy if exists "chat participants upload files" on storage.objects;
create policy "chat participants upload files" on storage.objects for insert to authenticated
with check(bucket_id='chat-attachments' and public.is_chat_participant(((storage.foldername(name))[1])::uuid));
drop policy if exists "chat participants read files" on storage.objects;
create policy "chat participants read files" on storage.objects for select to authenticated
using(bucket_id='chat-attachments' and public.is_chat_participant(((storage.foldername(name))[1])::uuid));

create or replace function public.start_listing_conversation(p_listing_id uuid,p_other_user uuid,p_other_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_title text; v_me_name text; v_phone text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_other_user is null or p_other_user=auth.uid() then raise exception 'Invalid recipient'; end if;
  select title into v_title from public.job_listings where id=p_listing_id;
  if v_title is null then raise exception 'Listing not found'; end if;
  select c.id into v_id from public.chat_conversations c
  join public.chat_participants a on a.conversation_id=c.id and a.user_id=auth.uid()
  join public.chat_participants b on b.conversation_id=c.id and b.user_id=p_other_user
  where c.listing_id=p_listing_id limit 1;
  if v_id is null then
    insert into public.chat_conversations(listing_id,listing_title) values(p_listing_id,v_title) returning id into v_id;
    select coalesce(full_name,'LoadLink user'),phone into v_me_name,v_phone from public.profiles where id=auth.uid();
    insert into public.chat_participants(conversation_id,user_id,display_name,phone) values
      (v_id,auth.uid(),coalesce(v_me_name,'LoadLink user'),v_phone),
      (v_id,p_other_user,coalesce(nullif(trim(p_other_name),''),'LoadLink user'),null);
  end if;
  return v_id;
end; $$;

create or replace function public.get_my_conversations()
returns table(id uuid,listing_id uuid,listing_title text,other_user_id uuid,other_name text,other_phone text,last_message text,last_message_at timestamptz,unread_count bigint,other_last_seen timestamptz)
language sql security definer set search_path=public as $$
  select c.id,c.listing_id,c.listing_title,op.user_id,op.display_name,op.phone,
    lm.body,lm.created_at,
    (select count(*) from public.chat_messages um where um.conversation_id=c.id and um.sender_id<>auth.uid() and um.created_at>me.last_read_at),
    p.last_seen
  from public.chat_conversations c
  join public.chat_participants me on me.conversation_id=c.id and me.user_id=auth.uid()
  join public.chat_participants op on op.conversation_id=c.id and op.user_id<>auth.uid()
  left join public.profiles p on p.id=op.user_id
  left join lateral (select body,created_at from public.chat_messages where conversation_id=c.id order by created_at desc limit 1) lm on true
  order by coalesce(lm.created_at,c.updated_at) desc;
$$;

create or replace function public.get_conversation_messages(p_conversation_id uuid)
returns setof public.chat_messages language sql security definer set search_path=public as $$
 select * from public.chat_messages where conversation_id=p_conversation_id and public.is_chat_participant(p_conversation_id) order by created_at asc limit 500;
$$;

create or replace function public.get_daily_message_remaining()
returns integer language plpgsql security definer set search_path=public as $$
declare v_plan text; v_used integer;
begin
 if auth.uid() is null then return 0; end if;
 select subscription_plan into v_plan from public.profiles where id=auth.uid();
 if coalesce(v_plan,'standard')='pro' then return 999999; end if;
 select count(*) into v_used from public.chat_messages where sender_id=auth.uid() and created_at>=date_trunc('day',now());
 return greatest(0,50-v_used);
end; $$;

create or replace function public.send_chat_message(p_conversation_id uuid,p_body text,p_file_path text default null,p_file_name text default null,p_file_type text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_remaining integer; v_id uuid;
begin
 if not public.is_chat_participant(p_conversation_id) then raise exception 'Not authorised'; end if;
 v_remaining:=public.get_daily_message_remaining();
 if v_remaining<=0 then raise exception 'Daily message limit reached'; end if;
 if coalesce(trim(p_body),'')='' and p_file_path is null then raise exception 'Empty message'; end if;
 insert into public.chat_messages(conversation_id,sender_id,body,file_path,file_name,file_type)
 values(p_conversation_id,auth.uid(),coalesce(trim(p_body),''),p_file_path,p_file_name,p_file_type) returning id into v_id;
 update public.chat_conversations set updated_at=now() where id=p_conversation_id;
 update public.profiles set last_seen=now() where id=auth.uid();
 return jsonb_build_object('id',v_id,'remaining',greatest(0,v_remaining-1));
end; $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.chat_participants set last_read_at=now() where conversation_id=p_conversation_id and user_id=auth.uid();
 update public.profiles set last_seen=now() where id=auth.uid();
end; $$;

create or replace function public.get_unread_chat_count()
returns bigint language sql security definer set search_path=public as $$
 select count(*) from public.chat_messages m join public.chat_participants p on p.conversation_id=m.conversation_id and p.user_id=auth.uid() where m.sender_id<>auth.uid() and m.created_at>p.last_read_at;
$$;

-- Pro viewer identities: authenticated viewers are shown to Pro listing owners; anonymous traffic stays aggregated.
alter table if exists public.job_view_events add column if not exists viewer_user_id uuid references auth.users(id) on delete set null;

create or replace function public.record_job_view(p_job_id uuid,p_viewer_key text,p_device_type text default 'unknown',p_source text default 'direct')
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into public.job_view_events(job_id,viewer_key,viewer_user_id,device_type,source,viewed_at)
 values(p_job_id,p_viewer_key,auth.uid(),p_device_type,p_source,now());
 update public.job_listings set view_count=coalesce(view_count,0)+1,last_viewed_at=now() where id=p_job_id;
end; $$;

-- Ensure chat tables are available to Realtime.
do $$ begin
 alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;

create or replace function public.get_pro_job_analytics(p_job_id uuid,p_owner_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_job public.job_listings%rowtype; v_result jsonb;
begin
 select * into v_job from public.job_listings where id=p_job_id;
 if v_job.id is null then raise exception 'Listing not found'; end if;
 if coalesce(v_job.package_type,'standard')<>'pro' then raise exception 'Pro analytics required'; end if;
 if coalesce(v_job.owner_key,'')<>coalesce(p_owner_key,'') and coalesce(v_job.user_id,'00000000-0000-0000-0000-000000000000'::uuid)<>auth.uid() then raise exception 'Not authorised'; end if;
 select jsonb_build_object(
  'total_views',coalesce(v_job.view_count,0),
  'unique_viewers',(select count(distinct viewer_key) from public.job_view_events where job_id=p_job_id),
  'last_viewed_at',v_job.last_viewed_at,
  'daily_views',(select coalesce(jsonb_agg(jsonb_build_object('label',to_char(day,'Dy'),'count',count) order by day),'[]'::jsonb) from (select d.day,count(e.*) from generate_series(current_date-6,current_date,'1 day') d(day) left join public.job_view_events e on e.job_id=p_job_id and e.viewed_at>=d.day and e.viewed_at<d.day+interval '1 day' group by d.day) q),
  'devices',(select coalesce(jsonb_agg(jsonb_build_object('label',device_type,'count',count)),'[]'::jsonb) from (select coalesce(device_type,'unknown') device_type,count(*) count from public.job_view_events where job_id=p_job_id group by 1 order by 2 desc) q),
  'sources',(select coalesce(jsonb_agg(jsonb_build_object('label',source,'count',count)),'[]'::jsonb) from (select coalesce(source,'direct') source,count(*) count from public.job_view_events where job_id=p_job_id group by 1 order by 2 desc) q),
  'recent_viewers',(select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(p.full_name,'LoadLink member'),'viewed_at',e.viewed_at) order by e.viewed_at desc),'[]'::jsonb) from (select viewer_user_id,max(viewed_at) viewed_at from public.job_view_events where job_id=p_job_id and viewer_user_id is not null group by viewer_user_id order by max(viewed_at) desc limit 12) e left join public.profiles p on p.id=e.viewer_user_id)
 ) into v_result;
 return v_result;
end; $$;
