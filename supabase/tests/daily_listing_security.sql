-- Run after the daily listing migration. Fixtures live in a subtransaction
-- deliberately rolled back after the assertions; no real accounts are changed.
do $test$
declare
  owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid();
  listing_id uuid; order_data jsonb; first_boost jsonb; repeat_boost jsonb;
  seconds_left bigint; credit_count integer; candidate jsonb;
begin
  if (public.loadlink_get_manual_listing_product()->>'duration_days')::int<>1
     or (public.loadlink_get_manual_listing_product()->>'unit_price_cents')::int<>1500 then
    raise exception 'Daily price contract failed'; end if;
  if has_column_privilege('anon','public.job_listings','owner_key','select')
     or has_column_privilege('authenticated','public.job_listings','owner_key','select') then
    raise exception 'Private owner key is readable'; end if;
  if has_function_privilege('anon','public.loadlink_request_listing_boost(uuid)','execute')
     or has_function_privilege('anon','public.loadlink_get_my_listing_recommendations()','execute') then
    raise exception 'Anonymous mutation or private intelligence access is enabled'; end if;
  if exists(select 1 from public.get_public_job_listings() r
    where to_jsonb(r) ?| array['owner_key','payment_reference','moderation_notes','fraud_score']) then
    raise exception 'Public listing response contains private fields'; end if;

  begin
    insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values(owner_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'listing-test-'||owner_id::text||'@example.invalid',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
      (other_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'listing-test-'||other_id::text||'@example.invalid',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
    insert into public.profiles(id,full_name,onboarding_complete)
    values(owner_id,'Listing regression owner',true),(other_id,'Listing regression other owner',true)
    on conflict(id) do update set onboarding_complete=true;
    order_data:=public.loadlink_create_manual_credit_order(owner_id,2);
    perform public.loadlink_grant_manual_credit_after_review((order_data->>'payment_id')::uuid,
      order_data->>'reference','fixture',3000,'ZAR');

    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    insert into public.job_listings(title,city,vehicle_group,rate,posted_by,contact_number,description,photos,
      user_id,owner_key,listing_kind,package_type,status,moderation_status)
    values('Regression vehicle listing','Pretoria','Trucks / Trailers','R1500','Regression owner','0820000000',
      'Listing type: Truck' || chr(10) || repeat('Complete vehicle information. ',6),
      array['https://example.invalid/one.jpg','https://example.invalid/two.jpg'],owner_id,
      gen_random_uuid()::text||gen_random_uuid()::text,'vehicle','standard','active','pending') returning id into listing_id;
    if not exists(select 1 from public.job_listings where id=listing_id and package_type='manual' and manual_credit_id is not null) then
      raise exception 'Paid credit did not authorize the vehicle listing'; end if;

    perform set_config('request.jwt.claims','{}',true);
    update public.job_listings set moderation_status='approved',approved_at=now()-interval '5 days' where id=listing_id;
    if not exists(select 1 from public.job_listings where id=listing_id and daily_billing_enabled
      and expires_at between now()+interval '23 hours 59 minutes' and now()+interval '24 hours 1 minute') then
      raise exception 'Approval did not start exactly one paid day'; end if;
    update public.job_listings set expires_at=now()+interval '10 hours' where id=listing_id;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    if not public.set_my_listing_status(listing_id,'draft','') then raise exception 'Owner pause failed'; end if;
    select paused_listing_seconds into seconds_left from public.job_listings where id=listing_id;
    if seconds_left not between 35999 and 36000 then raise exception 'Paused paid time was not preserved: %',seconds_left; end if;
    if not public.set_my_listing_status(listing_id,'active','') then raise exception 'Owner resume failed'; end if;
    select count(*) into credit_count from public.manual_listing_credits where user_id=owner_id and status='consumed';
    if credit_count<>1 then raise exception 'Resuming unused paid time consumed another credit'; end if;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated')::text,true);
    if public.set_my_listing_status(listing_id,'closed','') then raise exception 'Another user changed the listing'; end if;
    begin
      perform public.loadlink_request_listing_boost(listing_id);
      raise exception 'Another user boosted the listing';
    exception when others then
      if sqlerrm<>'Only your active, approved listings can be boosted.' then raise; end if;
    end;
    begin
      insert into public.dealership_profiles(owner_user_id,slug,name,verification_status,status,verified,is_public)
      values(other_id,'regression-'||other_id::text,'Regression dealer','approved','approved',true,true);
      raise exception 'Owner self-approval was accepted';
    exception when others then
      if sqlerrm<>'Dealership approval requires an authorised LoadLink review.' then raise; end if;
    end;

    perform set_config('request.jwt.claims','{}',true);
    update public.job_listings set expires_at=now()-interval '1 hour' where id=listing_id;
    perform loadlink_private.renew_daily_listings();
    select count(*) into credit_count from public.manual_listing_credits where user_id=owner_id and status='consumed';
    if credit_count<>2 then raise exception 'Daily renewal did not consume exactly one prepaid credit'; end if;
    perform loadlink_private.renew_daily_listings();
    select count(*) into credit_count from public.manual_listing_credits where user_id=owner_id and status='consumed';
    if credit_count<>2 then raise exception 'Daily renewal consumed a duplicate credit'; end if;

    candidate:=loadlink_private.listing_recommendations(owner_id);
    if jsonb_array_length(candidate)<>1 or candidate->0->>'reason'<>'low_visibility' then
      raise exception 'Stalled listing did not get the correct visibility recommendation'; end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
    first_boost:=public.loadlink_request_listing_boost(listing_id);
    repeat_boost:=public.loadlink_request_listing_boost(listing_id);
    if first_boost->>'id' is distinct from repeat_boost->>'id' or not (repeat_boost->>'reused')::boolean then
      raise exception 'Repeated boost request created another order'; end if;
    if jsonb_array_length(public.loadlink_get_my_listing_recommendations())<>0 then
      raise exception 'A pending boost was suggested again'; end if;

    raise exception using errcode='PT001',message='ROLLBACK_FIXTURES_AFTER_SUCCESS';
  exception when sqlstate 'PT001' then null;
  end;
end;
$test$;
