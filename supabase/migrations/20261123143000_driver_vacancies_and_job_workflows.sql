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
