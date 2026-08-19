-- LoadLink final-audit Control Centre review queues.
-- Keeps privileged moderation reads behind staff-checked SECURITY DEFINER RPCs.

create or replace function public.loadlink_admin_listing_queue(
  p_status text default 'pending',
  p_kind text default 'all',
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then
    raise exception 'Admin permission required';
  end if;
  if coalesce(p_status,'pending') not in ('all','pending','approved','rejected') then raise exception 'Invalid moderation status'; end if;
  if coalesce(p_kind,'all') not in ('all','job','contract','vehicle') then raise exception 'Invalid listing type'; end if;

  return query
  select jsonb_build_object(
    'id',j.id,'title',j.title,'city',j.city,'listing_kind',j.listing_kind,'vehicle_group',j.vehicle_group,'rate',j.rate,
    'posted_by',j.posted_by,'user_id',j.user_id,
    'owner_name',coalesce(nullif(trim(p.full_name),''),nullif(trim(p.company_name),''),j.posted_by),'owner_email',p.email,
    'package_type',j.package_type,'photos',coalesce(j.photos,'{}'::text[]),'description',j.description,
    'moderation_status',j.moderation_status,'moderation_notes',j.moderation_notes,'rejection_reason',j.rejection_reason,
    'status',j.status,'lifecycle_status',j.lifecycle_status,'stock_status',j.stock_status,
    'dealership_id',j.dealership_id,'dealership_name',dp.name,'dealership_verification_status',dp.verification_status,'dealership_platform_status',dp.platform_status,
    'created_at',j.created_at,'expires_at',j.expires_at,'verification_id',vv.id,'vehicle_verification_status',vv.status,
    'id_document_path',vv.id_document_path,'licence_document_path',vv.licence_document_path,
    'registration_document_path',vv.registration_document_path,'ownership_document_path',vv.ownership_document_path,
    'company_registration_document_path',vv.company_registration_document_path,'tax_document_path',vv.tax_document_path,
    'business_address_document_path',vv.business_address_document_path,'representative_authority_document_path',vv.representative_authority_document_path
  )
  from public.job_listings j
  left join public.profiles p on p.id=j.user_id
  left join public.vehicle_verifications vv on vv.listing_id=j.id
  left join public.dealership_profiles dp on dp.id=j.dealership_id
  where (coalesce(p_status,'pending')='all' or j.moderation_status=coalesce(p_status,'pending'))
    and (coalesce(p_kind,'all')='all' or j.listing_kind=coalesce(p_kind,'all'))
  order by case when j.moderation_status='pending' then 0 else 1 end,j.created_at asc
  limit greatest(1,least(coalesce(p_limit,100),200))
  offset greatest(0,coalesce(p_offset,0));
end;
$$;
revoke all on function public.loadlink_admin_listing_queue(text,text,integer,integer) from public,anon;
grant execute on function public.loadlink_admin_listing_queue(text,text,integer,integer) to authenticated;

create or replace function public.loadlink_admin_identity_verification_queue(
  p_status text default 'pending',
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then raise exception 'Admin permission required'; end if;
  if coalesce(p_status,'pending') not in ('all','phone_verified','pending','under_review','more_information_required','verified','rejected') then raise exception 'Invalid verification status'; end if;
  return query
  select to_jsonb(v)
  from public.verification_requests v
  where coalesce(p_status,'pending')='all' or v.status=coalesce(p_status,'pending')
  order by case when v.status in ('pending','under_review') then 0 else 1 end,v.submitted_at asc nulls last
  limit greatest(1,least(coalesce(p_limit,100),200))
  offset greatest(0,coalesce(p_offset,0));
end;
$$;
revoke all on function public.loadlink_admin_identity_verification_queue(text,integer,integer) from public,anon;
grant execute on function public.loadlink_admin_identity_verification_queue(text,integer,integer) to authenticated;

create or replace function public.review_verification(request_id uuid,decision text,reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_user uuid;
  v_clean_reason text:=nullif(trim(coalesce(reason,'')),'');
begin
  if not public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then raise exception 'Admin permission required'; end if;
  if decision not in ('verified','rejected','more_information_required') then raise exception 'Invalid verification decision'; end if;
  if decision in ('rejected','more_information_required') and length(coalesce(v_clean_reason,''))<5 then raise exception 'Add a clear reason for this decision'; end if;

  select to_jsonb(v),v.user_id into v_before,v_user from public.verification_requests v where v.id=request_id for update;
  if v_before is null then raise exception 'Verification request not found'; end if;

  update public.verification_requests
  set status=decision,reviewer_notes=case when decision='verified' then null else v_clean_reason end,
      rejection_reason=case when decision='rejected' then v_clean_reason else null end,
      reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=request_id returning to_jsonb(verification_requests.*) into v_after;

  update public.profiles
  set verification_status=case when decision='verified' then 'verified' when decision='rejected' then 'rejected' else 'pending' end,
      verified_at=case when decision='verified' then now() else null end,updated_at=now()
  where id=v_user;

  if to_regclass('public.user_notifications') is not null and v_user is not null then
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id,metadata)
    values(v_user,'verification_review',
      case when decision='verified' then 'Verification approved' when decision='rejected' then 'Verification needs attention' else 'More information required' end,
      case when decision='verified' then 'Your LoadLink identity verification is approved.' else v_clean_reason end,
      '/verification-status','verification_request',request_id,jsonb_build_object('status',decision,'reason',v_clean_reason));
  end if;

  if to_regclass('public.admin_audit_trail') is not null then
    insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'verification.'||decision,'verification_request',request_id::text,v_before,v_after);
  end if;
  return jsonb_build_object('ok',true,'status',decision,'request_id',request_id);
end;
$$;
revoke all on function public.review_verification(uuid,text,text) from public,anon;
grant execute on function public.review_verification(uuid,text,text) to authenticated;

drop policy if exists "LoadLink staff read verification files" on storage.objects;
create policy "LoadLink staff read verification files"
on storage.objects for select to authenticated
using (
  bucket_id in ('verification-documents','vehicle-verification')
  and public.loadlink_is_staff(array['moderator','operations','verification','admin','owner'])
);
