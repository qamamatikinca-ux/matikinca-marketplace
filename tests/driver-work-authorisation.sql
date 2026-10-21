begin;
select set_config('request.jwt.claim.sub','f0a00000-0000-4000-8000-000000000021',true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into auth.users(id,aud,role,email,created_at,updated_at) values ('f0a00000-0000-4000-8000-000000000021','authenticated','authenticated','loadlink-qa-work-evidence@example.invalid',now(),now());
set local role authenticated;
do $$
declare p jsonb; d public.driver_profiles; result jsonb;
begin
 p:=jsonb_build_object('full_name','QA driver','city','Pretoria','province','Gauteng','phone','0821234567','email','qa@example.invalid','years_experience',5,'licence_code','EC','vehicle_types',jsonb_build_array('Truck'),'prdp_required',false,'citizenship_status','foreign_national','nationality','Zimbabwe','passport_expiry',(current_date+730)::text,'work_authorisation_type','work_visa','work_authorisation_expiry',(current_date+365)::text);
 d:=public.loadlink_upsert_my_driver_profile(p);
 if d.years_experience<>5 or d.citizenship_status<>'foreign_national' then raise exception 'FAIL profile fields did not persist'; end if;
 insert into public.driver_documents(profile_id,user_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256) values
 (d.id,auth.uid(),'identity',auth.uid()::text||'/identity/qa.pdf','qa.pdf','application/pdf',100,repeat('a',64)),
 (d.id,auth.uid(),'drivers_licence',auth.uid()::text||'/drivers_licence/qa.pdf','qa.pdf','application/pdf',100,repeat('b',64));
 begin
  perform public.loadlink_save_and_submit_my_driver_profile(p);
  raise exception 'FAIL missing work document passed';
 exception when others then
  if sqlerrm not like '%work authorisation document%' then raise; end if;
 end;
 insert into public.driver_documents(profile_id,user_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256) values
 (d.id,auth.uid(),'work_authorisation',auth.uid()::text||'/work_authorisation/qa.pdf','qa.pdf','application/pdf',100,repeat('c',64));
 result:=public.loadlink_save_and_submit_my_driver_profile(p);
 if result->>'status'<>'pending' then raise exception 'FAIL valid application did not submit'; end if;
 result:=public.loadlink_save_and_submit_my_driver_profile(p || jsonb_build_object('passport_expiry',''));
 if result->>'status'<>'pending' then raise exception 'FAIL alternative identity document could not be submitted'; end if;
 begin
  perform public.loadlink_save_and_submit_my_driver_profile(p||jsonb_build_object('work_authorisation_expiry',(current_date-1)::text));
  raise exception 'FAIL expired work authorisation passed';
 exception when others then
  if sqlerrm not like '%valid work authorisation expiry%' then raise; end if;
 end;
 begin
  update public.driver_profiles set status='approved' where id=d.id;
  raise exception 'FAIL applicant approved own application';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.loadlink_replace_my_driver_document('work_authorisation',auth.uid()::text||'/work_authorisation/not-uploaded.pdf','forged.pdf','application/pdf',100,repeat('d',64));
  raise exception 'FAIL nonexistent upload was accepted';
 exception when others then
  if sqlerrm not like '%Uploaded document not found%' then raise; end if;
 end;
end $$;
reset role;
do $$
begin
 update public.driver_profiles set work_authorisation_expiry=current_date-1 where user_id=auth.uid();
 begin
  update public.driver_profiles set status='approved' where user_id=auth.uid();
  raise exception 'FAIL approval bypass accepted expired work evidence';
 exception when others then
  if sqlerrm not like '%Current work authorisation is required%' then raise; end if;
 end;
 update public.driver_profiles set work_authorisation_expiry=current_date+365,status='approved' where user_id=auth.uid();
end $$;
set local role anon;
do $$
declare public_row jsonb;
begin
 select to_jsonb(d) into public_row from public.loadlink_public_driver_profiles(50,0,null,'QA driver') d where user_id='f0a00000-0000-4000-8000-000000000021'::uuid;
 if public_row is null then raise exception 'FAIL approved driver not public'; end if;
 if public_row ?| array['nationality','passport_expiry','work_authorisation_type','work_authorisation_expiry','storage_path','phone','email'] then raise exception 'FAIL private fields leaked'; end if;
end $$;
reset role;
select jsonb_build_object('checks',9,'result','PASS: persistence, alternative identity documents, document requirement, valid submission, expired submission rejection, applicant cannot approve, object existence, all approval paths, public privacy') as verification;
rollback;
