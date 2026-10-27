-- Guided capture is supporting evidence, never an automatic badge or liveness verdict.
create table public.identity_live_checks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 purpose text not null check(purpose in ('driver','vehicle','account')),
 status text not null default 'collecting' check(status in ('collecting','pending_review','manual_match','retry_required')),
 challenge text[] not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '10 minutes',
 submitted_at timestamptz,
 id_path text, portrait_path text, video_path text,
 client_observations jsonb not null default '{}'::jsonb,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 review_feedback text
);
create index identity_live_checks_user_created on public.identity_live_checks(user_id,created_at desc);
create index identity_live_checks_queue on public.identity_live_checks(status,submitted_at desc);
create index identity_live_checks_reviewer on public.identity_live_checks(reviewed_by);
 alter table public.identity_live_checks enable row level security;
revoke all on public.identity_live_checks from public,anon,authenticated;
grant select on public.identity_live_checks to authenticated;
grant all on public.identity_live_checks to service_role;
create policy live_checks_read_own on public.identity_live_checks for select to authenticated using(user_id=(select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('identity-live-evidence','identity-live-evidence',false,6291456,array['image/jpeg','video/webm','video/mp4']);
create policy live_evidence_upload on storage.objects for insert to authenticated with check (
 bucket_id='identity-live-evidence' and split_part(name,'/',1)=(select auth.uid())::text
 and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)
 and exists(select 1 from public.identity_live_checks c where c.user_id=(select auth.uid()) and c.id::text=split_part(name,'/',2) and c.status='collecting' and c.expires_at>now())
 and split_part(name,'/',3) in ('identity.jpg','portrait.jpg','capture.webm','capture.mp4')
 and array_length(string_to_array(name,'/'),1)=3
);
-- No client replacement, deletion or public read policy. Staff delivery uses audited short-lived URLs.
create function public.loadlink_start_live_check(p_purpose text) returns public.identity_live_checks
 language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid(); r public.identity_live_checks; side text;
 begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'SIGN_IN_REQUIRED' using errcode='28000'; end if;
 if p_purpose is null or p_purpose not in ('driver','vehicle','account') then raise exception 'Invalid purpose' using errcode='22023'; end if;
 if exists(select 1 from public.user_moderation_profiles where user_id=u and status in ('suspended','blocked')) then raise exception 'Account restricted' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('live-check:'||u::text,0));
 if (select count(*) from public.identity_live_checks where user_id=u and created_at>now()-interval '1 hour')>=5 then raise exception 'Too many attempts. Try again in an hour.' using errcode='54000'; end if;
 side:=case when random()<0.5 then 'left' else 'right' end;
 insert into public.identity_live_checks(user_id,purpose,challenge) values(u,p_purpose,array['centre',side,'centre',case when side='left' then 'right' else 'left' end,'centre']) returning * into r;
 return r;
 end $$;
revoke all on function public.loadlink_start_live_check(text) from public,anon;
grant execute on function public.loadlink_start_live_check(text) to authenticated;
create function public.loadlink_finish_live_check(p_id uuid,p_video_extension text,p_observations jsonb) returns uuid
 language plpgsql security definer set search_path='' as $$
 declare u uuid:=auth.uid(); r public.identity_live_checks; prefix text; f text;
 begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'SIGN_IN_REQUIRED' using errcode='28000'; end if;
 if exists(select 1 from public.user_moderation_profiles where user_id=u and status in ('suspended','blocked')) then raise exception 'Account restricted' using errcode='42501'; end if;
 select * into r from public.identity_live_checks where id=p_id and user_id=u for update;
 if not found then raise exception 'Check not found' using errcode='42501'; end if;
 if r.status='pending_review' then return r.id; end if;
 if r.status<>'collecting' or r.expires_at<now() then raise exception 'Check expired. Start again.' using errcode='55000'; end if;
 if p_video_extension is null or p_video_extension not in ('webm','mp4') or p_observations is null or jsonb_typeof(p_observations)<>'object' or octet_length(p_observations::text)>4096 then raise exception 'Invalid capture details' using errcode='22023'; end if;
 prefix:=u::text||'/'||r.id::text||'/';
 foreach f in array array['identity.jpg','portrait.jpg','capture.'||p_video_extension] loop
 if not exists(select 1 from storage.objects where bucket_id='identity-live-evidence' and name=prefix||f and (metadata->>'size')::bigint between 1 and 6291456) then raise exception 'Upload all evidence before submitting' using errcode='22023'; end if;
 end loop;
 update public.identity_live_checks set status='pending_review',submitted_at=now(),id_path=prefix||'identity.jpg',portrait_path=prefix||'portrait.jpg',video_path=prefix||'capture.'||p_video_extension,
 client_observations=jsonb_build_object('source','untrusted_browser','model','face-api-1.7.15','automatic_approval',false,'capture',p_observations) where id=r.id;
 insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id)
 values(u,'live_check_submitted','Camera check received','Your ID and camera evidence are waiting for a private manual review. No automatic verification has been granted.','/verify/live','identity_live_check',r.id);
 return r.id;
 end $$;
revoke all on function public.loadlink_finish_live_check(uuid,text,jsonb) from public,anon;
grant execute on function public.loadlink_finish_live_check(uuid,text,jsonb) to authenticated;

create function public.loadlink_review_live_check(p_id uuid,p_actor uuid,p_decision text,p_feedback text) returns void
 language plpgsql security definer set search_path='' as $$
 declare r public.identity_live_checks;
 begin
 if not exists(select 1 from public.admin_users where user_id=p_actor and is_active=true and coalesce(employment_status,'active')='active' and role in ('owner','admin','verification')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_decision is null or p_decision not in ('manual_match','retry_required') or p_feedback is null or length(trim(p_feedback)) not between 8 and 1000 then raise exception 'Decision and feedback required' using errcode='22023'; end if;
 select * into r from public.identity_live_checks where id=p_id for update;
 if not found or r.user_id=p_actor then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if r.status<>'pending_review' then raise exception 'VERSION_CONFLICT' using errcode='55000'; end if;
 update public.identity_live_checks set status=p_decision,reviewed_by=p_actor,reviewed_at=now(),review_feedback=trim(p_feedback) where id=r.id;
 insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,metadata)
 values(p_actor,'live_check_reviewed','identity_live_check',r.id,jsonb_build_object('decision',p_decision,'automatic_verification_granted',false));
 insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id)
 values(r.user_id,'live_check_reviewed','Your camera check was reviewed',trim(p_feedback),'/verify/live','identity_live_check',r.id);
 end $$;
revoke all on function public.loadlink_review_live_check(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.loadlink_review_live_check(uuid,uuid,text,text) to service_role;
