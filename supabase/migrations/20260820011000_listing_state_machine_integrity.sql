-- LoadLink final-audit listing state-machine repair.
-- Jobs/contracts may be text-only; vehicle listings require real photos.
-- Owner content edits always return a listing to pending review.

create or replace function public.loadlink_guard_listing_insert_v266()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_user uuid:=auth.uid();
  v_plan text:='standard';
  v_photo_limit integer:=5;
  v_account_status text:='active';
  v_is_dealer boolean:=false;
  v_kind text:=lower(coalesce(new.listing_kind,'job'));
  v_photo_count integer:=cardinality(coalesce(new.photos,'{}'::text[]));
begin
  if v_user is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if new.user_id is distinct from v_user then new.user_id:=v_user; end if;
  if not coalesce((select onboarding_complete from public.profiles where id=v_user),false) then raise exception 'PROFILE_SETUP_REQUIRED'; end if;

  if to_regclass('public.user_moderation_profiles') is not null then
    select coalesce(status,'active') into v_account_status from public.user_moderation_profiles where user_id=v_user;
    v_account_status:=coalesce(v_account_status,'active');
  end if;
  if v_account_status in ('blocked','suspended') then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;
  perform public.loadlink_enforce_rate_limit('listing:create',8,600);

  v_plan:=coalesce(public.loadlink_active_plan(v_user),'standard');
  if to_regclass('public.dealership_profiles') is not null then
    select exists(select 1 from public.dealership_profiles where owner_user_id=v_user and coalesce(platform_status,'active') not in ('blocked','suspended')) into v_is_dealer;
  end if;
  if v_plan in ('pro','dealer') or v_is_dealer then v_photo_limit:=15; end if;

  if v_photo_count>v_photo_limit then raise exception 'PHOTO_LIMIT_EXCEEDED:%',v_photo_limit; end if;
  if v_kind='vehicle' and v_photo_count<2 then raise exception 'AT_LEAST_TWO_PHOTOS_REQUIRED'; end if;
  if length(trim(coalesce(new.title,'')))<2 then raise exception 'LISTING_TITLE_REQUIRED'; end if;
  if length(trim(coalesce(new.city,'')))<2 then raise exception 'LISTING_LOCATION_REQUIRED'; end if;
  if length(trim(coalesce(new.description,'')))<2 then raise exception 'LISTING_DESCRIPTION_REQUIRED'; end if;

  if lower(coalesce(new.package_type,'standard')) in ('pro','dealer') and v_plan not in ('pro','dealer') and not v_is_dealer then
    new.package_type:='standard'; new.sponsored:=false;
  end if;
  new.status:='active'; new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
  return new;
end;
$$;

create or replace function public.loadlink_enforce_listing_rules()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_limit integer:=5;
  v_photo_count integer:=0;
  v_plan text:='standard';
  v_content_changed boolean:=false;
  v_resubmission boolean:=coalesce(current_setting('loadlink.resubmission',true),'')='on';
begin
  if public.loadlink_is_staff(array['moderator','operations','admin','owner']) then return new; end if;
  if auth.uid() is null then
    if session_user in ('postgres','supabase_admin') then return new; end if;
    raise exception 'Authentication required';
  end if;
  if tg_op='UPDATE' and old.user_id is distinct from auth.uid() then raise exception 'Only the listing owner can update this listing'; end if;

  new.user_id:=auth.uid();
  new.listing_kind:=lower(coalesce(new.listing_kind,'job'));
  if new.listing_kind not in ('job','contract','vehicle') then raise exception 'Invalid listing type'; end if;
  if tg_op='UPDATE' and new.listing_kind is distinct from old.listing_kind then raise exception 'A listing type cannot be changed after creation'; end if;

  if new.listing_kind in ('job','contract') then
    v_plan:='standard'; new.package_type:='standard'; new.expires_at:=coalesce(new.expires_at,now()+interval '30 days');
  elsif tg_op='INSERT' then
    v_plan:=lower(coalesce(new.package_type,''));
    if v_plan not in ('manual','pro','dealer') then raise exception 'Paid vehicle listing access is required'; end if;
    if v_plan='manual' and new.listing_access_period_id is null then raise exception 'Manual listing access is no longer available'; end if;
  else
    v_plan:=lower(coalesce(old.package_type,new.package_type,'standard'));
    new.package_type:=old.package_type;
    new.listing_access_period_id:=old.listing_access_period_id;
    new.expires_at:=old.expires_at;
    new.payment_status:=old.payment_status;
  end if;

  select listing_image_limit into v_limit from public.marketplace_plan_rules where plan_code=v_plan;
  v_limit:=coalesce(v_limit,5);
  v_photo_count:=coalesce(array_length(new.photos,1),0);
  if v_photo_count>v_limit then raise exception 'This package allows a maximum of % listing images',v_limit; end if;

  if tg_op='INSERT' then
    new.sponsored:=false; new.sponsor_label:=null; new.sponsored_until:=null; new.featured_until:=null; new.display_tier:=1;
    new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
    new.lifecycle_status:='draft'; new.status:='active'; new.approved_at:=null; new.rejection_reason:=null;
  else
    v_content_changed:=new.title is distinct from old.title or new.city is distinct from old.city or new.vehicle_group is distinct from old.vehicle_group or
      new.rate is distinct from old.rate or new.contact_number is distinct from old.contact_number or new.whatsapp_number is distinct from old.whatsapp_number or
      new.description is distinct from old.description or new.photos is distinct from old.photos;

    new.sponsored:=old.sponsored; new.sponsor_label:=old.sponsor_label; new.sponsored_until:=old.sponsored_until; new.featured_until:=old.featured_until; new.display_tier:=old.display_tier;

    if v_content_changed or v_resubmission then
      new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
      new.approved_at:=null; new.rejection_reason:=null; new.lifecycle_status:='draft';
      if new.status not in ('active','filled','closed','draft') then new.status:='active'; end if;
    else
      new.moderation_status:=old.moderation_status; new.moderation_notes:=old.moderation_notes; new.moderated_at:=old.moderated_at; new.moderated_by:=old.moderated_by;
      new.approved_at:=old.approved_at; new.rejection_reason:=old.rejection_reason;
      if new.lifecycle_status not in ('draft','live','paused','expired','archived') then new.lifecycle_status:=old.lifecycle_status; end if;
      if new.status not in ('active','filled','closed','draft') then new.status:=old.status; end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.loadlink_enforce_dealer_photo_rule()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  n integer:=coalesce(array_length(new.photos,1),0);
  v_owner uuid;
  v_sub jsonb;
  v_admin boolean:=false;
  v_is_dealer boolean:=new.dealership_id is not null;
  v_content_changed boolean:=false;
  v_resubmission boolean:=coalesce(current_setting('loadlink.resubmission',true),'')='on';
begin
  if not v_is_dealer then return new; end if;
  if auth.uid() is null then
    if session_user in ('postgres','supabase_admin') then return new; end if;
    raise exception 'Authentication required';
  end if;

  if to_regprocedure('public.loadlink_phase2_is_admin()') is not null then begin execute 'select public.loadlink_phase2_is_admin()' into v_admin; exception when others then v_admin:=false; end; end if;
  if not v_admin and to_regprocedure('public.loadlink_is_admin()') is not null then begin execute 'select public.loadlink_is_admin()' into v_admin; exception when others then v_admin:=false; end; end if;

  select owner_user_id into v_owner from public.dealership_profiles where id=new.dealership_id;
  if v_owner is null then raise exception 'Dealership not found'; end if;

  if not v_admin then
    if not public.loadlink_dealer_has_permission(new.dealership_id,'inventory.write') then raise exception 'You do not have inventory editing permission for this dealership'; end if;
    v_sub:=public.loadlink_dealer_subscription_state(v_owner);
    if coalesce(v_sub->>'status','expired') not in ('active','past_due','grace_period') then raise exception 'An active Dealer package or billing grace period is required'; end if;

    if tg_op='INSERT' then
      new.package_type:='dealer'; new.listing_kind:='vehicle'; new.sponsored:=false;
      new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
      new.lifecycle_status:='draft'; new.stock_status:='available'; new.status:='active';
    else
      if new.dealership_id is distinct from old.dealership_id then raise exception 'A Dealer listing cannot be moved to another dealership'; end if;
      new.package_type:=old.package_type; new.payment_status:=old.payment_status; new.expires_at:=old.expires_at; new.listing_access_period_id:=old.listing_access_period_id;
      v_content_changed:=new.title is distinct from old.title or new.city is distinct from old.city or new.vehicle_group is distinct from old.vehicle_group or
        new.rate is distinct from old.rate or new.contact_number is distinct from old.contact_number or new.whatsapp_number is distinct from old.whatsapp_number or
        new.description is distinct from old.description or new.photos is distinct from old.photos;
      if v_content_changed or v_resubmission then
        new.moderation_status:='pending'; new.moderation_notes:=null; new.moderated_at:=null; new.moderated_by:=null;
        new.approved_at:=null; new.rejection_reason:=null; new.lifecycle_status:='draft';
        if new.status not in ('active','filled','closed','draft') then new.status:='active'; end if;
      else
        new.moderation_status:=old.moderation_status; new.moderation_notes:=old.moderation_notes; new.moderated_at:=old.moderated_at; new.moderated_by:=old.moderated_by;
        new.approved_at:=old.approved_at; new.rejection_reason:=old.rejection_reason;
        if new.lifecycle_status not in ('draft','live','paused','expired','archived') then new.lifecycle_status:=old.lifecycle_status; end if;
        if new.status not in ('active','filled','closed','draft') then new.status:=old.status; end if;
      end if;
      if new.stock_status='sold' then new.lifecycle_status:='archived'; end if;
    end if;
  end if;

  n:=coalesce(array_length(new.photos,1),0);
  if n>15 then raise exception 'Dealer listings support up to 15 photos'; end if;
  if lower(coalesce(new.moderation_status,'pending')) in ('pending','approved') and lower(coalesce(new.status,'active'))<>'draft' and n<10 then raise exception 'Dealer listings require at least 10 photos before submission'; end if;
  if lower(coalesce(new.lifecycle_status,'draft'))='live' then
    if n<10 then raise exception 'Dealer listings require at least 10 photos before publishing'; end if;
    if new.moderation_status<>'approved' then raise exception 'LoadLink approval is required before publishing Dealer stock'; end if;
    if new.stock_status='sold' then raise exception 'Sold stock cannot be published'; end if;
    if not v_admin and not exists(select 1 from public.dealership_profiles p where p.id=new.dealership_id and p.verification_status='approved' and p.platform_status='active') then raise exception 'Dealer verification and good standing are required before publishing'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.resubmit_my_listing_v2(
  p_listing_id uuid,p_title text,p_city text,p_vehicle_group text,p_rate text,p_contact_number text,p_description text,p_photos text[] default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_row public.job_listings%rowtype;
  v_existing_description text;
  v_listing_prefix text:='';
  v_updated integer;
  v_photo_count integer:=cardinality(coalesce(p_photos,'{}'::text[]));
  v_photo_limit integer:=5;
  v_group text:=trim(coalesce(p_vehicle_group,''));
begin
  if auth.uid() is null then return false; end if;
  if public.loadlink_account_is_restricted(auth.uid()) then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;
  if v_group not in ('Catering / Event','Trucks / Trailers','Farming / Mining') then raise exception 'Choose a valid LoadLink vehicle category'; end if;
  if length(trim(coalesce(p_title,'')))<2 or length(trim(coalesce(p_city,'')))<2 or length(trim(coalesce(p_rate,'')))<1 or length(trim(coalesce(p_contact_number,'')))<10 or length(trim(coalesce(p_description,'')))<2 then raise exception 'Complete all required listing details'; end if;

  select * into v_row from public.job_listings where id=p_listing_id and user_id=auth.uid() for update;
  if not found then return false; end if;
  v_existing_description:=v_row.description;
  v_photo_limit:=case when lower(coalesce(v_row.package_type,'manual')) in ('pro','dealer') then 15 else 5 end;
  if p_photos is not null and v_photo_count>v_photo_limit then raise exception 'This package allows a maximum of % photos',v_photo_limit; end if;

  if v_existing_description ~* '^Listing type:' then
    v_listing_prefix:=split_part(v_existing_description,E'\n',1)||E'\n';
    if split_part(v_existing_description,E'\n',2) ~* '^Vehicle needed:' then v_listing_prefix:=v_listing_prefix||split_part(v_existing_description,E'\n',2)||E'\n'; end if;
  end if;

  perform set_config('loadlink.resubmission','on',true);
  update public.job_listings
  set title=trim(p_title),city=trim(p_city),vehicle_group=v_group,rate=trim(p_rate),contact_number=trim(p_contact_number),
      description=v_listing_prefix||trim(p_description),photos=case when p_photos is null then photos else p_photos end,
      moderation_status='pending',moderation_notes=null,moderated_at=null,moderated_by=null,lifecycle_status='draft',status='active',rejection_reason=null,approved_at=null,updated_at=now()
  where id=p_listing_id and user_id=auth.uid();
  get diagnostics v_updated=row_count;
  perform set_config('loadlink.resubmission','off',true);
  return v_updated=1;
end;
$$;

create or replace function public.update_my_listing(
  p_listing_id uuid,p_title text,p_city text,p_rate text,p_contact_number text,p_description text,p_owner_key text default ''
)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_existing_description text;
  v_listing_prefix text:='';
  v_updated integer;
begin
  if auth.uid() is null then return false; end if;
  if public.loadlink_account_is_restricted(auth.uid()) then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;
  if length(trim(coalesce(p_title,'')))<2 or length(trim(coalesce(p_city,'')))<2 or length(trim(coalesce(p_rate,'')))<1 or length(trim(coalesce(p_contact_number,'')))<10 or length(trim(coalesce(p_description,'')))<2 then raise exception 'Complete all required listing details'; end if;
  select description into v_existing_description from public.job_listings where id=p_listing_id and user_id=auth.uid();
  if not found then return false; end if;
  if v_existing_description ~* '^Listing type:' then
    v_listing_prefix:=split_part(v_existing_description,E'\n',1)||E'\n';
    if split_part(v_existing_description,E'\n',2) ~* '^Vehicle needed:' then v_listing_prefix:=v_listing_prefix||split_part(v_existing_description,E'\n',2)||E'\n'; end if;
  end if;
  perform set_config('loadlink.resubmission','on',true);
  update public.job_listings
  set title=trim(p_title),city=trim(p_city),rate=trim(p_rate),contact_number=trim(p_contact_number),description=v_listing_prefix||trim(p_description),
      moderation_status='pending',moderation_notes=null,moderated_at=null,moderated_by=null,lifecycle_status='draft',status='active',rejection_reason=null,approved_at=null,updated_at=now()
  where id=p_listing_id and user_id=auth.uid();
  get diagnostics v_updated=row_count;
  perform set_config('loadlink.resubmission','off',true);
  return v_updated=1;
end;
$$;

create or replace function public.loadlink_review_listing(p_listing_id uuid,p_decision text,p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_owner uuid;
  v_kind text;
  v_dealership uuid;
  v_photo_count integer:=0;
  v_clean_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then raise exception 'Forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select to_jsonb(j),j.user_id,j.listing_kind,j.dealership_id,coalesce(array_length(j.photos,1),0)
    into v_before,v_owner,v_kind,v_dealership,v_photo_count from public.job_listings j where j.id=p_listing_id for update;
  if v_before is null then return false; end if;
  if p_decision='rejected' and length(coalesce(v_clean_reason,''))<5 then raise exception 'A rejection reason is required'; end if;

  if p_decision='approved' and v_kind='vehicle' and v_dealership is not null then
    if v_photo_count<10 then raise exception 'Dealer stock requires at least 10 photos before approval'; end if;
    if not exists(select 1 from public.dealership_profiles d where d.id=v_dealership and d.verification_status='approved' and d.platform_status='active') then raise exception 'Approve the dealership before approving its stock'; end if;
  end if;

  update public.job_listings
  set moderation_status=p_decision,moderation_notes=case when p_decision='rejected' then v_clean_reason else null end,
      lifecycle_status=case when p_decision='approved' then 'live' else 'draft' end,
      status=case when p_decision='approved' then 'active' else 'draft' end,
      rejection_reason=case when p_decision='rejected' then v_clean_reason else null end,
      approved_at=case when p_decision='approved' then now() else null end,updated_at=now()
  where id=p_listing_id returning to_jsonb(job_listings.*) into v_after;

  if v_kind='vehicle' then
    update public.vehicle_verifications
    set status=case when p_decision='approved' then 'verified' else 'rejected' end,
        reviewer_notes=case when p_decision='rejected' then v_clean_reason else null end,updated_at=now()
    where listing_id=p_listing_id;
  end if;

  insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'listing.'||p_decision,'listing',p_listing_id::text,v_before,v_after);
  perform public.loadlink_emit_event('listing.'||p_decision,'listing',p_listing_id::text,jsonb_build_object('reason',v_clean_reason));
  return true;
end;
$$;

update public.job_listings
set lifecycle_status='live',updated_at=now()
where moderation_status='approved' and status='active' and lifecycle_status='draft' and dealership_id is null and (expires_at is null or expires_at>now());
