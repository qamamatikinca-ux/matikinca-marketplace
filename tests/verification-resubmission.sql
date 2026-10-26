-- Run inside BEGIN/ROLLBACK. All identities and storage metadata are synthetic.
insert into auth.users(id,phone,phone_confirmed_at) values
 ('ad000000-0000-4000-8000-000000000001','27990000001',now()),
 ('ad000000-0000-4000-8000-000000000002','27990000002',null);
insert into storage.objects(bucket_id,name) values
 ('verification-documents','ad000000-0000-4000-8000-000000000001/identity.png'),
 ('verification-documents','ad000000-0000-4000-8000-000000000001/selfie.png');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.loadlink_submit_my_verification('Synthetic Applicant','passport','1234','ad000000-0000-4000-8000-000000000001/identity.png','ad000000-0000-4000-8000-000000000001/selfie.png',null);
-- Exact retry is idempotent.
select public.loadlink_submit_my_verification('Synthetic Applicant','passport','1234','ad000000-0000-4000-8000-000000000001/identity.png','ad000000-0000-4000-8000-000000000001/selfie.png',null);
reset role;
do $$ begin
 if (select evidence_revision from public.verification_requests where user_id='ad000000-0000-4000-8000-000000000001')<>1 then raise exception 'Retry duplicated revision'; end if;
 if has_any_column_privilege('authenticated','public.verification_requests','UPDATE') then raise exception 'Client direct updates remain enabled'; end if;
end $$;
update public.verification_requests set status='rejected',reviewed_at=now(),reviewed_by='ad000000-0000-4000-8000-000000000002',rejection_reason='Synthetic rejection',reviewer_notes='Synthetic note' where user_id='ad000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.loadlink_submit_my_verification('Synthetic Applicant Updated','passport','1234','ad000000-0000-4000-8000-000000000001/identity.png','ad000000-0000-4000-8000-000000000001/selfie.png',null);
reset role;
do $$ begin
 if not exists(select 1 from public.verification_requests where user_id='ad000000-0000-4000-8000-000000000001' and evidence_revision=2 and status='pending' and reviewed_at is null and reviewed_by is null and rejection_reason is null and reviewer_notes is null) then raise exception 'Rejected application did not reset'; end if;
 if not exists(select 1 from private.verification_submission_history where user_id='ad000000-0000-4000-8000-000000000001' and revision=1 and snapshot->>'rejection_reason'='Synthetic rejection') then raise exception 'Previous decision lost'; end if;
end $$;
update public.verification_requests set status='more_information_required',reviewed_at=now() where user_id='ad000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.loadlink_submit_my_verification('Synthetic Applicant Updated','passport','1234','ad000000-0000-4000-8000-000000000001/identity.png','ad000000-0000-4000-8000-000000000001/selfie.png',null);
do $$ begin
 begin
  perform public.loadlink_submit_my_verification('Synthetic Applicant','passport','1234','someone-else/identity.png','ad000000-0000-4000-8000-000000000001/selfie.png',null);
  raise exception 'Cross-owner path accepted';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',true);
 begin
  perform public.loadlink_submit_my_verification('Synthetic Applicant','passport','1234','x','y',null);
  raise exception 'Anonymous application accepted';
 exception when invalid_authorization_specification then null; end;
 perform set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 begin
  perform public.loadlink_submit_my_verification('Synthetic Applicant','passport','1234','x','y',null);
  raise exception 'Unverified phone accepted';
 exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.verification_requests set status='under_review' where user_id='ad000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.loadlink_submit_my_verification('Synthetic Applicant','passport','1234','ad000000-0000-4000-8000-000000000001/identity.png','ad000000-0000-4000-8000-000000000001/selfie.png',null);
  raise exception 'Under-review application replaced';
 exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
select 'Verification resubmission assertions passed' as result;
