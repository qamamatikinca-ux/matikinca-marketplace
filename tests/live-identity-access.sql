-- Run inside BEGIN/ROLLBACK. No real user data or image bytes.
insert into auth.users(id) values('ae000000-0000-4000-8000-000000000001'),('ae000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.loadlink_start_live_check('driver');
reset role;
insert into storage.objects(bucket_id,name,metadata)
 select 'identity-live-evidence',user_id::text||'/'||id::text||'/'||f,'{"size":100}'::jsonb
 from public.identity_live_checks cross join (values('identity.jpg'),('portrait.jpg'),('capture.webm'))files(f) where user_id='ae000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ declare c uuid; begin
 select id into c from public.identity_live_checks where user_id=auth.uid();
 perform public.loadlink_finish_live_check(c,'webm','{"complete":true,"comparison_distance":0,"approved":true}');
 if (select status from public.identity_live_checks where id=c)<>'pending_review' then raise exception 'Client claim granted approval'; end if;
 perform public.loadlink_finish_live_check(c,'webm','{}');
 begin
 update public.identity_live_checks set status='manual_match' where id=c;
 raise exception 'Client could approve';
 exception when insufficient_privilege then null; end;
 if has_function_privilege('authenticated','public.loadlink_review_live_check(uuid,uuid,text,text)','EXECUTE') then raise exception 'Review function exposed'; end if;
 perform set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 if exists(select 1 from public.identity_live_checks where id=c) then raise exception 'Cross-account read'; end if;
 begin
 perform public.loadlink_finish_live_check(c,'webm','{}');raise exception 'Cross-account finish';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',true);
 if exists(select 1 from public.identity_live_checks where id=c) then raise exception 'Anonymous read'; end if;
 begin
 perform public.loadlink_start_live_check('account'); raise exception 'Anonymous capture';
 exception when invalid_authorization_specification then null;end;
end $$;
reset role;
update public.identity_live_checks set status='collecting',expires_at=now()-interval '1 minute' where user_id='ae000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare c uuid;begin
 select id into c from public.identity_live_checks where user_id=auth.uid();
 begin perform public.loadlink_finish_live_check(c,'webm','{}');raise exception 'Expired capture accepted';exception when object_not_in_prerequisite_state then null;end;
end $$;
reset role;
select 'Live check authorization assertions passed' as result;
