-- Submit through one authenticated transaction; keep past review decisions private.
alter table public.verification_requests add column if not exists evidence_revision integer not null default 1;
create table if not exists private.verification_submission_history (
  request_id uuid not null references public.verification_requests(id) on delete cascade,
  revision integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  recorded_at timestamptz not null default now(),
  primary key(request_id,revision)
);
alter table private.verification_submission_history enable row level security;
revoke all on private.verification_submission_history from public,anon,authenticated;
grant all on private.verification_submission_history to service_role;

create or replace function public.loadlink_submit_my_verification(
  p_full_name text, p_id_type text, p_last4 text,
  p_id_path text, p_selfie_path text, p_company_path text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid := auth.uid();
  v_phone text;
  v_existing public.verification_requests%rowtype;
  v_saved public.verification_requests%rowtype;
  v_path text;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Sign in before submitting verification.' using errcode='28000';
  end if;
  if exists(select 1 from public.user_moderation_profiles where user_id=v_uid and status in ('suspended','blocked')) then
    raise exception 'Account access is restricted.' using errcode='42501';
  end if;
  select phone into v_phone from auth.users where id=v_uid and phone_confirmed_at is not null and nullif(phone,'') is not null;
  if v_phone is null then raise exception 'Verify your phone before submitting identity details.' using errcode='22023'; end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 160
    or p_id_type is null or p_id_type not in ('south_african_id','passport')
    or p_last4 is null or p_last4 !~ '^[0-9]{4}$'
    or p_id_path is null or p_selfie_path is null or p_id_path=p_selfie_path then
    raise exception 'Check your name, identity details and documents.' using errcode='22023';
  end if;
  foreach v_path in array array[p_id_path,p_selfie_path,p_company_path] loop
    if v_path is not null then
      if length(v_path)>512 or split_part(v_path,'/',1)<>v_uid::text
        or not exists(select 1 from storage.objects where bucket_id='verification-documents' and name=v_path) then
        raise exception 'Upload documents to your own verification account.' using errcode='42501';
      end if;
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('verification-submit:'||v_uid::text,0));
  select * into v_existing from public.verification_requests where user_id=v_uid for update;
  if found then
    if v_existing.status not in ('pending','rejected','more_information_required','phone_verified') then
      raise exception 'This application is already being reviewed or verified. Check verification status.' using errcode='55000';
    end if;
    if v_existing.status='pending' and v_existing.full_name=trim(p_full_name)
      and v_existing.id_type=p_id_type and v_existing.id_number_last4=p_last4
      and v_existing.id_document_path=p_id_path and v_existing.selfie_path=p_selfie_path
      and v_existing.company_document_path is not distinct from p_company_path then
      return v_existing.id;
    end if;
  end if;
  if (select count(*) from private.verification_submission_history where user_id=v_uid and recorded_at>now()-interval '1 hour')>=5 then
    raise exception 'Too many verification submissions. Please try again later.' using errcode='54000';
  end if;
  if v_existing.id is not null then
    insert into private.verification_submission_history(request_id,revision,user_id,snapshot)
      values(v_existing.id,v_existing.evidence_revision,v_uid,to_jsonb(v_existing))
      on conflict(request_id,revision) do update set snapshot=excluded.snapshot;
  end if;
  insert into public.verification_requests(user_id,full_name,phone,id_type,id_number_last4,id_document_path,selfie_path,company_document_path,status)
    values(v_uid,trim(p_full_name),v_phone,p_id_type,p_last4,p_id_path,p_selfie_path,p_company_path,'pending')
    on conflict(user_id) do update set
      full_name=excluded.full_name,phone=excluded.phone,id_type=excluded.id_type,id_number_last4=excluded.id_number_last4,
      id_document_path=excluded.id_document_path,selfie_path=excluded.selfie_path,company_document_path=excluded.company_document_path,
      status='pending',reviewed_at=null,reviewed_by=null,reviewer_notes=null,rejection_reason=null,
      submitted_at=now(),updated_at=now(),evidence_revision=public.verification_requests.evidence_revision+1
    returning * into v_saved;
  insert into private.verification_submission_history(request_id,revision,user_id,snapshot)
    values(v_saved.id,v_saved.evidence_revision,v_uid,to_jsonb(v_saved));
  return v_saved.id;
end;
$$;
revoke all on function public.loadlink_submit_my_verification(text,text,text,text,text,text) from public,anon;
grant execute on function public.loadlink_submit_my_verification(text,text,text,text,text,text) to authenticated;
revoke insert,update on public.verification_requests from anon,authenticated;
-- Fresh UUID paths are already used by the client. Old evidence cannot be overwritten.
drop policy if exists "loadlink_private_verification_documents" on storage.objects;
drop policy if exists "users replace own verification documents" on storage.objects;
