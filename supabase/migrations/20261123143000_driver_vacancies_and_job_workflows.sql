-- LoadLink marketplace workflows. Additive migration; existing listings and profiles are untouched.
create table if not exists public.driver_vacancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  listing_term text not null default 'job' check (listing_term in ('job','contract')),
  title text not null check (char_length(title) between 5 and 160),
  company_name text not null check (char_length(company_name) between 2 and 160),
  city text not null check (char_length(city) between 2 and 140),
  province text not null default '',
  employment_type text not null default 'contract' check (employment_type in ('permanent','fixed_term','temporary','contract')),
  licence_code text not null check (char_length(licence_code) between 1 and 12),
  requires_prdp boolean not null default true,
  min_years_experience integer not null default 0 check (min_years_experience between 0 and 60),
  vehicle_type text not null default '',
  pay_terms text not null default '',
  starts_on date,
  duration text not null default '',
  description text not null check (char_length(description) between 20 and 6000),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists driver_vacancies_discovery on public.driver_vacancies(status,listing_term,created_at desc);
create index if not exists driver_vacancies_owner on public.driver_vacancies(user_id,created_at desc);
alter table public.driver_vacancies enable row level security;
create policy "Driver vacancies open or owned" on public.driver_vacancies for select to anon, authenticated
  using (status='open' or user_id=(select auth.uid()));
create policy "Owners create driver vacancies" on public.driver_vacancies for insert to authenticated
  with check (user_id=(select auth.uid()) and not public.loadlink_marketplace_is_restricted((select auth.uid())));
create policy "Owners edit driver vacancies" on public.driver_vacancies for update to authenticated
  using (user_id=(select auth.uid()) and not public.loadlink_marketplace_is_restricted((select auth.uid())))
  with check (user_id=(select auth.uid()) and not public.loadlink_marketplace_is_restricted((select auth.uid())));
grant select on public.driver_vacancies to anon, authenticated;
grant insert, update on public.driver_vacancies to authenticated;

create table if not exists public.driver_vacancy_applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.driver_vacancies(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id),
  driver_profile_id uuid not null references public.driver_profiles(id),
  profile_snapshot jsonb not null default '{}'::jsonb,
  message text not null default '' check (char_length(message)<=2000),
  status text not null default 'submitted' check (status in ('submitted','under_review','shortlisted','interview','offered','accepted','hired','unsuccessful','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vacancy_id,driver_user_id)
);
create index if not exists driver_applications_driver on public.driver_vacancy_applications(driver_user_id,created_at desc);
create index if not exists driver_applications_vacancy on public.driver_vacancy_applications(vacancy_id,created_at desc);
alter table public.driver_vacancy_applications enable row level security;
create policy "Applicant and recruiter read applications" on public.driver_vacancy_applications for select to authenticated
  using (driver_user_id=(select auth.uid()) or exists (select 1 from public.driver_vacancies v where v.id=vacancy_id and v.user_id=(select auth.uid())));
create policy "Driver applies with own profile" on public.driver_vacancy_applications for insert to authenticated
  with check (driver_user_id=(select auth.uid()) and not public.loadlink_marketplace_is_restricted((select auth.uid())));
create policy "Participant changes application status" on public.driver_vacancy_applications for update to authenticated
  using (driver_user_id=(select auth.uid()) or exists(select 1 from public.driver_vacancies v where v.id=vacancy_id and v.user_id=(select auth.uid())))
  with check (driver_user_id=(select auth.uid()) or exists(select 1 from public.driver_vacancies v where v.id=vacancy_id and v.user_id=(select auth.uid())));
grant select,insert,update on public.driver_vacancy_applications to authenticated;

create or replace function public.loadlink_guard_driver_application()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare applicant public.driver_profiles%rowtype; recruiter uuid; vacancy_status text;
begin
  select v.user_id,v.status into recruiter,vacancy_status from public.driver_vacancies v where v.id=new.vacancy_id;
  if recruiter is null then raise exception 'Vacancy not found'; end if;
  if tg_op='INSERT' then
    if new.driver_user_id is distinct from auth.uid() then raise exception 'Use your own account to apply'; end if;
    if vacancy_status<>'open' then raise exception 'This vacancy is no longer accepting applications'; end if;
    if recruiter=auth.uid() then raise exception 'You cannot apply to your own vacancy'; end if;
    select * into applicant from public.driver_profiles where id=new.driver_profile_id and user_id=auth.uid();
    if applicant.id is null then raise exception 'Complete your LoadLink Driver Profile before applying'; end if;
    new.status:='submitted';
    new.profile_snapshot:=jsonb_build_object('driver_name',applicant.full_name,
      'licence_code',applicant.licence_code,'years_experience',applicant.years_experience,
      'vehicle_types',applicant.vehicle_types,'city',applicant.city,'province',applicant.province,
      'availability',applicant.availability,'profile_status',applicant.status,
      'prdp_expires_at',coalesce(applicant.prdp_expires_at,applicant.prdp_expiry),
      'licence_expires_at',coalesce(applicant.licence_expires_at,applicant.licence_expiry));
  else
    if new.id is distinct from old.id or new.vacancy_id is distinct from old.vacancy_id
      or new.driver_user_id is distinct from old.driver_user_id
      or new.driver_profile_id is distinct from old.driver_profile_id
      or new.profile_snapshot is distinct from old.profile_snapshot
      or new.created_at is distinct from old.created_at then
      raise exception 'Application identity and submitted profile cannot be changed';
    end if;
    if new.message is distinct from old.message then raise exception 'An application message cannot be rewritten after submission'; end if;
    if old.status in ('withdrawn','unsuccessful','hired') then raise exception 'This application is closed'; end if;
    if auth.uid()=old.driver_user_id then
      if not ((new.status='withdrawn') or (old.status='offered' and new.status='accepted'))
      then raise exception 'You can only withdraw, or accept an employment offer'; end if;
    elsif auth.uid()=recruiter then
      if new.status not in ('under_review','shortlisted','interview','offered','unsuccessful') and
        not (new.status='hired' and old.status='accepted')
      then raise exception 'The employer cannot make that status change'; end if;
    else raise exception 'You are not part of this application'; end if;
    if old.status=new.status then return new; end if;
  end if;
  new.updated_at:=now(); return new;
end $$;
revoke all on function public.loadlink_guard_driver_application() from public;
create trigger loadlink_guard_driver_application before insert or update on public.driver_vacancy_applications
  for each row execute function public.loadlink_guard_driver_application();

create table if not exists public.job_offer_preferences (
  listing_id uuid primary key references public.job_listings(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id),
  accepts_offers boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.job_offer_preferences enable row level security;
create policy "Offer preference is discoverable" on public.job_offer_preferences for select to anon, authenticated using (true);
create policy "Listing owner sets offer preference" on public.job_offer_preferences for insert to authenticated
 with check (owner_user_id=(select auth.uid()) and exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=(select auth.uid()) and j.listing_kind in ('job','contract')));
create policy "Listing owner updates offer preference" on public.job_offer_preferences for update to authenticated
 using(owner_user_id=(select auth.uid()))
 with check(owner_user_id=(select auth.uid()) and exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=(select auth.uid())));
grant select on public.job_offer_preferences to anon,authenticated;
grant insert,update on public.job_offer_preferences to authenticated;

create table if not exists public.job_chat_status_updates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  thread_id uuid references public.listing_guest_threads(id) on delete set null,
  user_id uuid not null references auth.users(id),
  status text not null check (status in ('still_discussing','agreement_reached','in_progress','completed_reported','pending_confirmation','no_agreement','cancelled','disputed')),
  note text not null default '' check (char_length(note)<=1500),
  created_at timestamptz not null default now()
);
create index if not exists job_chat_status_owner_idx on public.job_chat_status_updates(user_id,created_at desc);
create index if not exists job_chat_status_listing_idx on public.job_chat_status_updates(listing_id,created_at desc);
alter table public.job_chat_status_updates enable row level security;
create policy "Users read their own chat status history" on public.job_chat_status_updates for select to authenticated
 using (user_id=(select auth.uid()));
create policy "Users record their own job discussion outcome" on public.job_chat_status_updates for insert to authenticated
 with check(user_id=(select auth.uid()) and (
   exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=(select auth.uid()))
   or exists(select 1 from public.job_interests i where i.listing_id=listing_id and i.applicant_user_id=(select auth.uid()))
 ));
grant select,insert on public.job_chat_status_updates to authenticated;

create table if not exists public.job_tool_records (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  tool_key text not null check(char_length(tool_key) between 2 and 80),
  title text not null check(char_length(title) between 2 and 160),
  document_text text not null check(char_length(document_text)<=20000),
  created_at timestamptz not null default now()
);
create index if not exists job_tool_records_owner_idx on public.job_tool_records(user_id,listing_id,created_at desc);
alter table public.job_tool_records enable row level security;
create policy "Author reads linked job tool records" on public.job_tool_records for select to authenticated
 using(user_id=(select auth.uid()));
create policy "Author saves own job tool records" on public.job_tool_records for insert to authenticated
 with check(user_id=(select auth.uid()) and (
   exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=(select auth.uid()))
   or exists(select 1 from public.job_interests i where i.listing_id=listing_id and i.applicant_user_id=(select auth.uid()))
 ));
grant select,insert on public.job_tool_records to authenticated;

-- Recruitment messages live inside LoadLink's Messages workspace, separate from cargo chat.
create table if not exists public.driver_application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.driver_vacancy_applications(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists driver_application_messages_thread on public.driver_application_messages(application_id,created_at);
alter table public.driver_application_messages enable row level security;
create policy "Recruitment parties read messages" on public.driver_application_messages for select to authenticated
 using(exists(
  select 1 from public.driver_vacancy_applications a join public.driver_vacancies v on v.id=a.vacancy_id
  where a.id=application_id and (a.driver_user_id=(select auth.uid()) or v.user_id=(select auth.uid()))
 ));
create policy "Recruitment parties send messages" on public.driver_application_messages for insert to authenticated
 with check(sender_user_id=(select auth.uid()) and exists(
  select 1 from public.driver_vacancy_applications a join public.driver_vacancies v on v.id=a.vacancy_id
  where a.id=application_id and (a.driver_user_id=(select auth.uid()) or v.user_id=(select auth.uid()))
 ));
grant select,insert on public.driver_application_messages to authenticated;

-- Accepted chat quotations are recorded as immutable terms under the original job.
create table if not exists public.job_offer_awards (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  thread_id uuid not null references public.listing_guest_threads(id) on delete cascade,
  quote_message_id uuid not null unique references public.listing_guest_messages(id),
  poster_user_id uuid references auth.users(id),
  transporter_user_id uuid references auth.users(id),
  quote_snapshot jsonb not null,
  status text not null default 'pending_transporter' check(status in ('pending_transporter','confirmed')),
  accepted_at timestamptz not null default now(),
  transporter_confirmed_at timestamptz
);
create index if not exists job_offer_awards_poster on public.job_offer_awards(poster_user_id,accepted_at desc);
create index if not exists job_offer_awards_transporter on public.job_offer_awards(transporter_user_id,accepted_at desc);
alter table public.job_offer_awards enable row level security;
create policy "Award parties read accepted terms" on public.job_offer_awards for select to authenticated
  using(poster_user_id=(select auth.uid()) or transporter_user_id=(select auth.uid()));
create policy "Transporter confirms awarded terms" on public.job_offer_awards for update to authenticated
  using(transporter_user_id=(select auth.uid()) and status='pending_transporter')
  with check(transporter_user_id=(select auth.uid()) and status='confirmed');
grant select,update on public.job_offer_awards to authenticated;

create or replace function public.loadlink_guard_offer_award()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if new.id is distinct from old.id or new.listing_id is distinct from old.listing_id
     or new.thread_id is distinct from old.thread_id
     or new.quote_message_id is distinct from old.quote_message_id
     or new.poster_user_id is distinct from old.poster_user_id
     or new.transporter_user_id is distinct from old.transporter_user_id
     or new.quote_snapshot is distinct from old.quote_snapshot
     or new.accepted_at is distinct from old.accepted_at
  then raise exception 'Accepted quote details cannot be modified'; end if;
  if auth.uid() is distinct from old.transporter_user_id or old.status<>'pending_transporter'
     or new.status<>'confirmed' then raise exception 'Only the transport operator can confirm a pending award'; end if;
  new.transporter_confirmed_at:=now();
  return new;
end $$;
revoke all on function public.loadlink_guard_offer_award() from public;
create trigger loadlink_guard_offer_award before update on public.job_offer_awards
 for each row execute function public.loadlink_guard_offer_award();

create or replace function public.loadlink_record_accepted_transport_quote()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare rec record;
begin
  if new.message_kind<>'quote' or new.sender_role<>'buyer' then return new; end if;
  if coalesce(new.structured_payload->>'status','')<>'accepted'
    or coalesce(old.structured_payload->>'status','')='accepted' then return new; end if;
  select j.id as listing_id,j.user_id as poster_user_id,j.listing_kind,t.buyer_user_id,
       coalesce(p.accepts_offers,false) as accepts_offers into rec
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  left join public.job_offer_preferences p on p.listing_id=j.id
  where t.id=new.thread_id;
  if rec.listing_id is null or rec.listing_kind not in ('job','contract') or not rec.accepts_offers then return new; end if;
  insert into public.job_offer_awards(listing_id,thread_id,quote_message_id,poster_user_id,transporter_user_id,quote_snapshot)
  values(rec.listing_id,new.thread_id,new.id,rec.poster_user_id,rec.buyer_user_id,new.structured_payload)
  on conflict(quote_message_id) do nothing;
  return new;
end $$;
revoke all on function public.loadlink_record_accepted_transport_quote() from public;
create trigger loadlink_record_accepted_transport_quote
 after update of structured_payload on public.listing_guest_messages
 for each row execute function public.loadlink_record_accepted_transport_quote();

-- A restricted, identity-bound check for signed-in members of the existing listing conversations.
create or replace function public.loadlink_is_listing_thread_participant(
  p_listing_id uuid,p_thread_id uuid,p_user_id uuid
) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select p_user_id=auth.uid() and (
   exists (select 1 from public.job_listings j where j.id=p_listing_id and j.user_id=p_user_id)
   or exists (select 1 from public.listing_guest_threads t
      where t.id=p_thread_id and t.listing_id=p_listing_id and t.buyer_user_id=p_user_id)
   or exists (select 1 from public.job_interests i where i.listing_id=p_listing_id and i.applicant_user_id=p_user_id)
 );
$$;
revoke all on function public.loadlink_is_listing_thread_participant(uuid,uuid,uuid) from public;
grant execute on function public.loadlink_is_listing_thread_participant(uuid,uuid,uuid) to authenticated;
drop policy "Users record their own job discussion outcome" on public.job_chat_status_updates;
create policy "Job conversation parties record their own outcome" on public.job_chat_status_updates for insert to authenticated
 with check (user_id=(select auth.uid()) and public.loadlink_is_listing_thread_participant(listing_id,thread_id,user_id));
drop policy "Users read their own chat status history" on public.job_chat_status_updates;
create policy "Conversation participants read shared status timeline" on public.job_chat_status_updates for select to authenticated
 using(user_id=(select auth.uid()) or
   (thread_id is not null and public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid()))));
alter table public.job_tool_records
 add column thread_id uuid references public.listing_guest_threads(id) on delete set null,
 add column shared_with_counterparty boolean not null default false;
drop policy "Author reads linked job tool records" on public.job_tool_records;
create policy "Participants read permitted job documents" on public.job_tool_records for select to authenticated
 using (user_id=(select auth.uid()) or
   (shared_with_counterparty and thread_id is not null and
     public.loadlink_is_listing_thread_participant(listing_id,thread_id,(select auth.uid()))));
drop policy "Author saves own job tool records" on public.job_tool_records;
create policy "Participants add their own job documents" on public.job_tool_records for insert to authenticated
 with check (user_id=(select auth.uid()) and
   public.loadlink_is_listing_thread_participant(listing_id,thread_id,user_id));

-- Job quotes must respect the poster's opt-in at the database boundary; vehicle quotes are unchanged.
CREATE OR REPLACE FUNCTION public.send_listing_guest_structured_message(p_thread_id uuid, p_access_key text, p_kind text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_role text;
  v_message_id uuid;
  v_payload jsonb;
  v_unit text;
  v_vat text;
begin
  v_role := public.guest_chat_role(p_thread_id, p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  if p_kind <> 'quote' then raise exception 'Unsupported structured message type'; end if;
  if exists (select 1 from public.listing_guest_threads t join public.job_listings j on j.id=t.listing_id where t.id=p_thread_id and j.listing_kind in ('job','contract')) then
    if auth.uid() is null or v_role <> 'buyer' or not exists (
      select 1 from public.listing_guest_threads t
      join public.job_listings j on j.id=t.listing_id
      join public.job_offer_preferences p on p.listing_id=j.id
      where t.id=p_thread_id and t.buyer_user_id=auth.uid()
        and j.listing_kind in ('job','contract')
        and coalesce(j.status,'active')='active'
        and p.accepts_offers
    ) then raise exception 'This poster does not accept formal offers, or you are not permitted to submit one'; end if;
  end if;
  if not public.guest_chat_is_pro(p_access_key) and public.guest_chat_daily_message_count(p_access_key) >= 50 then
    raise exception 'Daily message limit reached. Free accounts can send 50 messages per day.';
  end if;
  if char_length(trim(coalesce(p_payload->>'amount',''))) not between 1 and 40 then raise exception 'Enter a quote amount'; end if;

  v_unit := case when p_payload->>'unit' in ('total','km','ton','day') then p_payload->>'unit' else 'total' end;
  v_vat := case when p_payload->>'vat' in ('included','excluded','not_applicable') then p_payload->>'vat' else 'not_applicable' end;
  v_payload := jsonb_build_object(
    'amount', left(trim(coalesce(p_payload->>'amount','')),40),
    'unit', v_unit,
    'vehicle', left(trim(coalesce(p_payload->>'vehicle','')),160),
    'route', left(trim(coalesce(p_payload->>'route','')),300),
    'availability', left(trim(coalesce(p_payload->>'availability','')),160),
    'vat', v_vat,
    'terms', left(trim(coalesce(p_payload->>'terms','')),1000),
    'listing_title', left(trim(coalesce(p_payload->>'listing_title','')),220),
    'status', 'pending'
  );

  insert into public.listing_guest_messages(thread_id, sender_role, body, message_kind, structured_payload)
  values(p_thread_id, v_role, 'Sent a rate quote', 'quote', v_payload)
  returning id into v_message_id;

  update public.listing_guest_threads set updated_at = now() where id = p_thread_id;
  return v_message_id;
end;
$function$;

-- Only the authenticated job poster can accept or decline job or contract offers.
CREATE OR REPLACE FUNCTION public.respond_listing_guest_quote(p_message_id uuid, p_access_key text, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_thread uuid;
  v_sender text;
  v_kind text;
  v_role text;
  v_current text;
begin
  select thread_id, sender_role, message_kind, structured_payload->>'status'
  into v_thread, v_sender, v_kind, v_current
  from public.listing_guest_messages where id = p_message_id and deleted_at is null;
  if v_thread is null or v_kind <> 'quote' then raise exception 'Quote not found'; end if;
  v_role := public.guest_chat_role(v_thread, p_access_key);
  if v_role is null then raise exception 'You do not have access to this conversation'; end if;
  if v_role = v_sender then raise exception 'The recipient must respond to this quote'; end if;
  if exists (select 1 from public.listing_guest_threads t join public.job_listings j on j.id=t.listing_id where t.id=v_thread and j.listing_kind in ('job','contract')) then
    if v_role <> 'owner' or not exists (
      select 1 from public.listing_guest_threads t
      join public.job_listings j on j.id=t.listing_id
      where t.id=v_thread and j.user_id=auth.uid()
    ) then raise exception 'Only the signed-in job poster can respond to a transport offer'; end if;
    if v_sender <> 'buyer' then raise exception 'Only operator offers can be awarded for transport jobs'; end if;
  end if;
  if p_status not in ('accepted','declined') then raise exception 'Invalid quote response'; end if;
  if coalesce(v_current,'pending') <> 'pending' then raise exception 'This quote already has a response'; end if;
  update public.listing_guest_messages
  set structured_payload = jsonb_set(jsonb_set(coalesce(structured_payload,'{}'::jsonb), '{status}', to_jsonb(p_status), true), '{responded_at}', to_jsonb(now()::text), true)
  where id = p_message_id;
  update public.listing_guest_threads set updated_at = now() where id = v_thread;
  return true;
end;
$function$;

-- Let authenticated drivers recover previously discussed transport jobs in their history.
-- No phone numbers, guest keys or private messages are exposed by this result.
create or replace function public.loadlink_my_transport_threads()
returns table(listing_id uuid,thread_id uuid)
language sql stable security definer set search_path=public,pg_temp as $$
  select distinct t.listing_id,t.id as thread_id
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  where auth.uid() is not null
    and t.buyer_user_id=auth.uid()
    and j.listing_kind in ('job','contract')
  order by t.listing_id,t.id
  limit 150;
$$;
revoke all on function public.loadlink_my_transport_threads() from public;
grant execute on function public.loadlink_my_transport_threads() to authenticated;


-- Return only transport threads involving the authenticated person.
create or replace function public.loadlink_my_transport_threads()
returns table(listing_id uuid, thread_id uuid)
language sql stable security definer set search_path=public,pg_temp as $$
  select t.listing_id,t.id
  from public.listing_guest_threads t
  join public.job_listings j on j.id=t.listing_id
  where auth.uid() is not null
    and j.listing_kind in ('job','contract')
    and (t.buyer_user_id=auth.uid() or j.user_id=auth.uid())
  order by t.updated_at desc limit 200;
$$;
revoke all on function public.loadlink_my_transport_threads() from public;
grant execute on function public.loadlink_my_transport_threads() to authenticated;

-- A shared document must refer to the same actual job conversation.
create or replace function public.loadlink_guard_job_tool_record()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if new.thread_id is not null and not exists(
    select 1 from public.listing_guest_threads t
    where t.id=new.thread_id and t.listing_id=new.listing_id
  ) then raise exception 'The selected conversation does not belong to this job'; end if;
  if new.shared_with_counterparty and new.thread_id is null then
    raise exception 'Choose a valid job conversation before sharing'; end if;
  return new;
end $$;
revoke all on function public.loadlink_guard_job_tool_record() from public;
create trigger loadlink_guard_job_tool_record
before insert on public.job_tool_records
for each row execute function public.loadlink_guard_job_tool_record();
