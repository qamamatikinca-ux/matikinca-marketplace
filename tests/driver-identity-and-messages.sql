-- Execute after the two driver migrations, entirely inside a rolled-back transaction.
-- These fixtures are synthetic; do not substitute real user records.
do $$
begin
 if has_any_column_privilege('authenticated','public.driver_profiles','INSERT') or has_any_column_privilege('authenticated','public.driver_profiles','UPDATE') then raise exception 'Direct driver profile writes remain enabled'; end if;
 if has_any_column_privilege('authenticated','public.driver_documents','INSERT') or has_any_column_privilege('authenticated','public.driver_documents','UPDATE') then raise exception 'Direct document writes remain enabled'; end if;
 if has_function_privilege('authenticated','public.loadlink_register_driver_document_for_user(uuid,text,text,text,text,bigint,text)','EXECUTE') then raise exception 'Ordinary users can register trusted documents'; end if;
 if has_function_privilege('authenticated','public.loadlink_replace_my_driver_document(text,text,text,text,bigint,text)','EXECUTE') then raise exception 'Legacy registration remains callable'; end if;
end $$;
insert into auth.users(id,raw_user_meta_data) values
 ('aa000000-0000-4000-8000-000000000001','{"full_name":"Synthetic driver"}'),
 ('aa000000-0000-4000-8000-000000000002','{"full_name":"Synthetic enquirer"}'),
 ('aa000000-0000-4000-8000-000000000003','{}'),
 ('aa000000-0000-4000-8000-000000000004','{}');
insert into public.driver_profiles(id,user_id,full_name,citizenship_status,status)
 values('bb000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001','Synthetic driver','south_african','draft');
do $$ begin
 begin
  update public.driver_profiles set status='approved' where id='bb000000-0000-4000-8000-000000000001';
  raise exception 'Approval without evidence unexpectedly succeeded';
 exception when raise_exception then
  if sqlerrm='Approval without evidence unexpectedly succeeded' then raise; end if;
 end;
 begin
  insert into public.driver_documents(profile_id,user_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256)
   values('bb000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000002','identity','fixture','fixture.png','image/png',8,repeat('0',64));
  raise exception 'Cross-owner document unexpectedly succeeded';
 exception when raise_exception then
  if sqlerrm='Cross-owner document unexpectedly succeeded' then raise; end if;
 end;
end $$;
insert into public.driver_documents(profile_id,user_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256)
 select 'bb000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001',type,'fixture/'||type,'fixture.png','image/png',8,repeat(code,64)
 from (values('portrait','1'),('identity','2'),('drivers_licence','3')) as fixtures(type,code);
insert into private.driver_identity_matches(profile_id,evidence,reviewed_by)
 select 'bb000000-0000-4000-8000-000000000001',jsonb_object_agg(document_type,sha256),'aa000000-0000-4000-8000-000000000004'
 from public.driver_documents where profile_id='bb000000-0000-4000-8000-000000000001';
update public.driver_profiles set status='approved',profile_image_url='/api/phase2/portrait/bb000000-0000-4000-8000-000000000001' where id='bb000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare t uuid; m uuid; m2 uuid; begin
 t:=public.loadlink_open_driver_chat('bb000000-0000-4000-8000-000000000001');
 if public.loadlink_open_driver_chat('bb000000-0000-4000-8000-000000000001')<>t then raise exception 'Duplicate thread'; end if;
 m:=public.loadlink_send_driver_message(t,'Synthetic message','cc000000-0000-4000-8000-000000000001');
 m2:=public.loadlink_send_driver_message(t,'Synthetic message','cc000000-0000-4000-8000-000000000001');
 if m<>m2 then raise exception 'Duplicate delivery'; end if;
 if (select count(*) from public.driver_thread_messages where thread_id=t)<>1 then raise exception 'Wrong message count'; end if;
 perform set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 if (select count(*) from public.driver_message_threads where id=t)<>0 then raise exception 'Stranger can read thread'; end if;
 if (select count(*) from public.driver_thread_messages where thread_id=t)<>0 then raise exception 'Stranger can read messages'; end if;
 begin
  perform public.loadlink_send_driver_message(t,'Unauthorized','cc000000-0000-4000-8000-000000000002');
  raise exception 'Stranger send unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 perform public.loadlink_close_driver_chat(t);
 begin
  perform public.loadlink_send_driver_message(t,'After closure','cc000000-0000-4000-8000-000000000003');
  raise exception 'Closed chat send unexpectedly succeeded';
 exception when raise_exception then
  if sqlerrm='Closed chat send unexpectedly succeeded' then raise; end if;
 end;
end $$;
reset role;
update public.driver_profiles set profile_expires_at=now()-interval '1 day' where id='bb000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.loadlink_driver_contact('bb000000-0000-4000-8000-000000000001');
  raise exception 'Expired driver contact unexpectedly succeeded';
 exception when no_data_found then null; end;
end $$;
reset role;
select 'driver security and messaging assertions passed' as result;
