-- LOADLINK NDA + ACCESS CONTROL
-- Additive Supabase migration. Does not delete listings, users, messages or existing account data.
-- Run this file once in Supabase SQL Editor before deploying the website files.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Existing LoadLink administrator and moderation contracts (created safely
--    when an older database does not have them yet).
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'viewer',
  department text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_moderation_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','flagged','suspended','blocked')),
  reason text,
  internal_notes text,
  strike_count integer not null default 0 check (strike_count >= 0),
  suspended_until timestamptz,
  last_action_by uuid references auth.users(id) on delete set null,
  last_action_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists role text not null default 'viewer';
alter table public.admin_users add column if not exists department text;
alter table public.admin_users add column if not exists is_active boolean not null default true;
alter table public.admin_users add column if not exists last_seen_at timestamptz;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();

alter table public.user_moderation_profiles add column if not exists status text not null default 'active';
alter table public.user_moderation_profiles add column if not exists reason text;
alter table public.user_moderation_profiles add column if not exists internal_notes text;
alter table public.user_moderation_profiles add column if not exists strike_count integer not null default 0;
alter table public.user_moderation_profiles add column if not exists suspended_until timestamptz;
alter table public.user_moderation_profiles add column if not exists last_action_by uuid references auth.users(id) on delete set null;
alter table public.user_moderation_profiles add column if not exists last_action_at timestamptz not null default now();
alter table public.user_moderation_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_moderation_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.admin_audit_logs add column if not exists admin_user_id uuid references auth.users(id) on delete set null;
alter table public.admin_audit_logs add column if not exists action text;
alter table public.admin_audit_logs add column if not exists entity_type text;
alter table public.admin_audit_logs add column if not exists entity_id uuid;
alter table public.admin_audit_logs add column if not exists reason text;
alter table public.admin_audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.admin_audit_logs add column if not exists created_at timestamptz not null default now();

alter table public.admin_users enable row level security;
alter table public.user_moderation_profiles enable row level security;
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.user_moderation_profiles from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;

create or replace function public.loadlink_nda_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.admin_users
    where user_id = auth.uid() and is_active = true
  );
$$;

revoke all on function public.loadlink_nda_is_admin() from public;
grant execute on function public.loadlink_nda_is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Versioned agreement, account-linked acceptance and immutable audit trail.
-- ---------------------------------------------------------------------------
create table if not exists public.loadlink_nda_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  summary text not null,
  agreement_text text not null,
  effective_at timestamptz not null default now(),
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(version) between 3 and 80),
  check (char_length(agreement_text) >= 1000)
);

create unique index if not exists loadlink_nda_one_active_idx
  on public.loadlink_nda_versions(is_active)
  where is_active = true;

create table if not exists public.loadlink_nda_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nda_version_id uuid not null references public.loadlink_nda_versions(id) on delete restrict,
  accepted_name text not null,
  accepted_email text,
  accepted_at timestamptz not null default now(),
  agreement_sha256 text not null,
  ip_sha256 text,
  user_agent_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, nda_version_id),
  check (char_length(accepted_name) between 2 and 160)
);

create index if not exists loadlink_nda_acceptances_user_idx
  on public.loadlink_nda_acceptances(user_id, accepted_at desc);
create index if not exists loadlink_nda_acceptances_version_idx
  on public.loadlink_nda_acceptances(nda_version_id, accepted_at desc);

create table if not exists public.loadlink_nda_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nda_version_id uuid references public.loadlink_nda_versions(id) on delete set null,
  event_type text not null check (event_type in ('accepted','declined','access_denied','version_published')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists loadlink_nda_events_created_idx
  on public.loadlink_nda_events(created_at desc);

create table if not exists public.loadlink_nda_settings (
  singleton boolean primary key default true check (singleton = true),
  enforcement_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.loadlink_nda_settings(singleton,enforcement_enabled)
values (true,true)
on conflict (singleton) do nothing;

-- Retains a one-way identifier for a blocked account's email. This prevents
-- the same identity from regaining access after an account deletion/recreation.
create table if not exists public.loadlink_blocked_identity_hashes (
  identity_type text not null check (identity_type in ('email')),
  identity_sha256 text not null,
  source_user_id uuid references auth.users(id) on delete set null,
  reason text,
  blocked_by uuid references auth.users(id) on delete set null,
  blocked_at timestamptz not null default now(),
  primary key (identity_type, identity_sha256)
);

alter table public.loadlink_nda_versions enable row level security;
alter table public.loadlink_nda_acceptances enable row level security;
alter table public.loadlink_nda_events enable row level security;
alter table public.loadlink_nda_settings enable row level security;
alter table public.loadlink_blocked_identity_hashes enable row level security;

revoke all on public.loadlink_nda_versions from anon, authenticated;
revoke all on public.loadlink_nda_acceptances from anon, authenticated;
revoke all on public.loadlink_nda_events from anon, authenticated;
revoke all on public.loadlink_nda_settings from anon, authenticated;
revoke all on public.loadlink_blocked_identity_hashes from anon, authenticated;

grant select on public.loadlink_nda_versions to anon, authenticated;
grant select on public.loadlink_nda_acceptances to authenticated;

drop policy if exists "read active nda" on public.loadlink_nda_versions;
create policy "read active nda" on public.loadlink_nda_versions
for select to anon, authenticated
using (is_active = true or public.loadlink_nda_is_admin());

drop policy if exists "users read own nda acceptance" on public.loadlink_nda_acceptances;
create policy "users read own nda acceptance" on public.loadlink_nda_acceptances
for select to authenticated
using (user_id = auth.uid() or public.loadlink_nda_is_admin());

-- ---------------------------------------------------------------------------
-- 3. Current LoadLink agreement.
-- ---------------------------------------------------------------------------
update public.loadlink_nda_versions
set is_active = false, updated_at = now()
where version <> '2026-08-02.1' and is_active = true;

insert into public.loadlink_nda_versions (
  version,
  title,
  summary,
  agreement_text,
  effective_at,
  is_active
)
values (
  '2026-08-02.1',
  'LoadLink Confidentiality and Restricted-Use Agreement',
  'This agreement protects non-public LoadLink information, platform content, user data, logistics opportunities, software and business methods from unauthorised copying, scraping, disclosure or competitive use.',
  $agreement$
LOADLINK CONFIDENTIALITY AND RESTRICTED-USE AGREEMENT

Effective date: 2 August 2026
Operator contact: loadlinksouthafrica@gmail.com

This Confidentiality and Restricted-Use Agreement (the “Agreement”) is entered into electronically between LoadLink, its owner or authorised operator (“LoadLink”), and the person accepting it (“User”). By selecting “Accept and enter LoadLink”, typing the User’s full name and continuing into the platform, the User confirms that the User has read, understood and agreed to be legally bound by this Agreement.

1. PURPOSE
LoadLink operates a logistics marketplace and related digital services that connect truck owners, mobile-unit owners, drivers, dealerships, businesses and other logistics participants. The User may receive access to information, tools, listings, contacts, documents, workflows, software features and business processes that LoadLink makes available only for legitimate use of the platform. This Agreement limits how that information and access may be used.

2. CONFIDENTIAL INFORMATION
“Confidential Information” means non-public information made available through or because of LoadLink, including private listing details, contact information, identity or verification information, documents, pricing discussions, rates, routes, cargo information, job or contract details, dealership information, user communications, unpublished features, security controls, administrative or Control Centre information, internal procedures, business plans, analytics, source code, database structures, algorithms, designs, workflows and technical methods.

Confidential Information does not include information that the User can prove: (a) was lawfully public without breach of this Agreement; (b) was already lawfully known to the User without a duty of confidentiality; (c) was independently developed without using LoadLink Confidential Information; or (d) was lawfully received from a third party who was permitted to disclose it.

3. PERMITTED USE
The User may use LoadLink and information obtained through LoadLink only for genuine logistics, employment, vehicle, dealership, contracting, communication or marketplace activity that is authorised by the platform. The User must use only the minimum information reasonably necessary for that purpose and must protect all non-public information from unauthorised access or disclosure.

4. PROHIBITED COPYING, REPLICATION AND COMPETITIVE USE
Except where LoadLink gives prior written permission, the User may not:
(a) copy, reproduce, republish, distribute, sell, license or commercially exploit LoadLink content or data;
(b) scrape, crawl, harvest, index, download in bulk, mirror or systematically capture listings, profiles, contact details, prices, routes, images, documents or other platform information;
(c) use LoadLink information, designs, workflows, software, database structures, business methods or marketplace intelligence to create, train, improve, operate or support a competing or substantially similar website, application, database, service or private marketplace;
(d) reverse engineer, decompile, disassemble, probe, test or attempt to discover source code, private APIs, security controls or non-public technical methods, except to the limited extent that applicable law expressly prevents such a restriction;
(e) remove ownership notices, watermarks, branding or access controls;
(f) sell, exchange or disclose user contact information or use it for unsolicited marketing, spam, fraud, profiling or any unrelated purpose;
(g) share account credentials, permit unauthorised account use, impersonate another person or use false information to obtain access; or
(h) use screenshots, recordings or extracts to disclose non-public information or to build a competing product. Ordinary screenshots kept only as reasonable evidence of a genuine transaction or support complaint are not prohibited.

5. USER AND THIRD-PARTY INFORMATION
The User must treat personal information, documents, messages and commercial information belonging to other LoadLink users as confidential. The User may contact another user only for the purpose connected to the relevant listing, profile, job, contract or transaction. The User must not retain such information longer than reasonably necessary or disclose it to anyone who does not need it for that authorised purpose.

6. INTELLECTUAL PROPERTY AND LIMITED ACCESS LICENCE
LoadLink and its licensors retain all rights in the platform, branding, software, layouts, designs, databases, original content and business methods. Acceptance gives the User a limited, revocable, non-exclusive and non-transferable permission to use the platform for its intended purpose. No ownership, source-code right, database right, trademark right or right to reproduce LoadLink is transferred to the User.

7. SECURITY, ACCOUNT RESTRICTIONS AND NO BYPASS
Access to LoadLink is conditional and may be suspended or blocked where LoadLink reasonably believes there has been fraud, abuse, unlawful activity, a security risk, a breach of this Agreement or another serious platform violation. A suspended or blocked User may not bypass the restriction by creating or using another account, changing an email address, using false identity details, sharing credentials, clearing browser data, using another device or employing a technical workaround. LoadLink may link a restriction to account and one-way identity records for security and enforcement purposes, subject to applicable law.

8. REQUIRED DISCLOSURE
Where the User is legally compelled to disclose Confidential Information, the User must, to the extent legally permitted, promptly notify LoadLink and disclose only the minimum information legally required. Nothing in this Agreement prevents a lawful report to a regulator, law-enforcement authority or court.

9. PRIVACY AND ACCEPTANCE RECORD
LoadLink may record the User’s account identifier, name, email address, agreement version, acceptance time, agreement hash and security audit data associated with acceptance or access denial. This information is used to prove acceptance, administer access, prevent abuse and protect the platform. Personal information must be processed in accordance with applicable South African data-protection law and LoadLink’s privacy notices.

10. DURATION
The User’s access obligations apply while the User has access to LoadLink. The confidentiality and restricted-use obligations continue for three years after the User’s last access, except that obligations relating to trade secrets, source code, security information, personal information and information that remains lawfully confidential continue for as long as the information remains protected by law or retains its confidential character.

11. BREACH AND REMEDIES
A breach may cause harm that cannot be adequately repaired by money alone. Subject to applicable law, LoadLink may suspend access, preserve evidence, seek an interdict or other urgent relief, claim proven damages and recover legal costs where a court permits. This clause does not create a penalty or remove any right or remedy available under law.

12. ELECTRONIC AGREEMENT
The User agrees that the electronic acceptance process, including the typed name, account record, timestamp and recorded agreement version, is intended to identify the User and show the User’s approval of this Agreement. Electronic records may be retained and used as evidence to the extent permitted by South African law.

13. CHANGES AND RE-ACCEPTANCE
LoadLink may publish a revised agreement where reasonably necessary for legal, security or platform changes. A material new version will require the User to review and accept it before access is restored. Continued access is not permitted until the current required version has been accepted.

14. GOVERNING LAW AND JURISDICTION
This Agreement is governed by the laws of the Republic of South Africa. The parties submit to the jurisdiction of the competent South African courts, including a court with jurisdiction in Gauteng, subject to any mandatory consumer or other legal rights that cannot lawfully be excluded.

15. GENERAL
If a provision is invalid or unenforceable, it must be limited or severed only to the minimum extent necessary, and the remaining provisions continue in effect. A failure to enforce a provision immediately is not a waiver. This Agreement does not exclude liability or rights that applicable law does not allow to be excluded. This Agreement, together with any applicable privacy policy and platform terms, records the agreement concerning confidentiality and restricted use of LoadLink.

ACKNOWLEDGEMENT
By accepting, the User confirms that the User is authorised to enter this Agreement, has had an opportunity to read it, understands that declining prevents access to LoadLink, and agrees not to copy, replicate, scrape, misuse or disclose protected LoadLink information.
$agreement$,
  '2026-08-02 00:00:00+02',
  true
)
on conflict (version) do nothing;

update public.loadlink_nda_versions
set is_active = (version = '2026-08-02.1'), updated_at = now()
where version = '2026-08-02.1' or is_active = true;

-- ---------------------------------------------------------------------------
-- 4. Public access state and acceptance functions.
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_access_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_status text := 'active';
  v_reason text;
  v_suspended_until timestamptz;
  v_nda public.loadlink_nda_versions%rowtype;
  v_accepted boolean := false;
  v_identity_blocked boolean := false;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_enforcement_enabled boolean := true;
  v_allowed boolean := false;
begin
  select enforcement_enabled into v_enforcement_enabled
  from public.loadlink_nda_settings where singleton = true;
  v_enforcement_enabled := coalesce(v_enforcement_enabled, true);

  select * into v_nda
  from public.loadlink_nda_versions
  where is_active = true and effective_at <= now()
  order by effective_at desc, created_at desc
  limit 1;

  if v_user_id is not null then
    v_is_admin := public.loadlink_nda_is_admin();

    select coalesce(status,'active'), reason, suspended_until
      into v_status, v_reason, v_suspended_until
    from public.user_moderation_profiles
    where user_id = v_user_id;

    v_status := coalesce(v_status, 'active');
    if v_status = 'suspended' and v_suspended_until is not null and v_suspended_until <= now() then
      v_status := 'active';
      v_reason := null;
      v_suspended_until := null;
    end if;

    if v_email <> '' then
      select exists(
        select 1 from public.loadlink_blocked_identity_hashes
        where identity_type = 'email'
          and identity_sha256 = encode(digest(v_email, 'sha256'), 'hex')
      ) into v_identity_blocked;
    end if;

    if v_identity_blocked then
      v_status := 'blocked';
      v_reason := coalesce(v_reason, 'This identity is linked to a blocked LoadLink account.');
    end if;

    if v_nda.id is null then
      v_accepted := true;
    else
      select exists(
        select 1 from public.loadlink_nda_acceptances
        where user_id = v_user_id and nda_version_id = v_nda.id
      ) into v_accepted;
    end if;
  end if;

  v_allowed := v_is_admin or (
    v_status not in ('suspended','blocked')
    and (
      not v_enforcement_enabled
      or (v_user_id is not null and v_accepted)
    )
  );

  return jsonb_build_object(
    'authenticated', v_user_id is not null,
    'allowed', v_allowed,
    'isAdmin', v_is_admin,
    'status', case when v_user_id is null then 'guest' else v_status end,
    'reason', v_reason,
    'suspendedUntil', v_suspended_until,
    'enforcementEnabled', v_enforcement_enabled,
    'requiresAcceptance', v_enforcement_enabled and v_nda.id is not null and not v_accepted,
    'ndaAccepted', (not v_enforcement_enabled) or v_accepted,
    'nda', case when v_nda.id is null then null else jsonb_build_object(
      'id', v_nda.id,
      'version', v_nda.version,
      'title', v_nda.title,
      'summary', v_nda.summary,
      'agreementText', v_nda.agreement_text,
      'effectiveAt', v_nda.effective_at,
      'sha256', encode(digest(v_nda.agreement_text, 'sha256'), 'hex')
    ) end
  );
end;
$$;

revoke all on function public.loadlink_access_state() from public;
grant execute on function public.loadlink_access_state() to anon, authenticated;

create or replace function public.loadlink_accept_current_nda(
  p_accepted_name text,
  p_ip_sha256 text default null,
  p_user_agent_sha256 text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_status text := 'active';
  v_suspended_until timestamptz;
  v_nda public.loadlink_nda_versions%rowtype;
begin
  if v_user_id is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_accepted_name,''))) < 2 then raise exception 'FULL_NAME_REQUIRED'; end if;

  select coalesce(status,'active'), suspended_until into v_status, v_suspended_until
  from public.user_moderation_profiles where user_id = v_user_id;
  v_status := coalesce(v_status,'active');
  if v_status='suspended' and v_suspended_until is not null and v_suspended_until <= now() then
    v_status := 'active';
  end if;

  if v_email <> '' and exists(
    select 1 from public.loadlink_blocked_identity_hashes
    where identity_type='email'
      and identity_sha256=encode(digest(v_email,'sha256'),'hex')
  ) then
    v_status := 'blocked';
  end if;

  if v_status in ('suspended','blocked') then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;

  select * into v_nda
  from public.loadlink_nda_versions
  where is_active = true and effective_at <= now()
  order by effective_at desc, created_at desc
  limit 1;

  if v_nda.id is null then raise exception 'NO_ACTIVE_AGREEMENT'; end if;

  insert into public.loadlink_nda_acceptances (
    user_id, nda_version_id, accepted_name, accepted_email, accepted_at,
    agreement_sha256, ip_sha256, user_agent_sha256, metadata
  ) values (
    v_user_id, v_nda.id, btrim(p_accepted_name), nullif(v_email,''), now(),
    encode(digest(v_nda.agreement_text,'sha256'),'hex'),
    nullif(btrim(coalesce(p_ip_sha256,'')),''),
    nullif(btrim(coalesce(p_user_agent_sha256,'')),''),
    coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (user_id, nda_version_id) do update
  set accepted_name = excluded.accepted_name,
      accepted_email = excluded.accepted_email,
      accepted_at = excluded.accepted_at,
      agreement_sha256 = excluded.agreement_sha256,
      ip_sha256 = excluded.ip_sha256,
      user_agent_sha256 = excluded.user_agent_sha256,
      metadata = excluded.metadata;

  insert into public.loadlink_nda_events(user_id, nda_version_id, event_type, metadata)
  values (v_user_id, v_nda.id, 'accepted', coalesce(p_metadata,'{}'::jsonb));

  return public.loadlink_access_state();
end;
$$;

revoke all on function public.loadlink_accept_current_nda(text,text,text,jsonb) from public;
grant execute on function public.loadlink_accept_current_nda(text,text,text,jsonb) to authenticated;

create or replace function public.loadlink_record_nda_decline(p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_nda_id uuid;
begin
  select id into v_nda_id
  from public.loadlink_nda_versions
  where is_active = true and effective_at <= now()
  order by effective_at desc, created_at desc
  limit 1;

  insert into public.loadlink_nda_events(user_id, nda_version_id, event_type, metadata)
  values (auth.uid(), v_nda_id, 'declined', coalesce(p_metadata,'{}'::jsonb));
end;
$$;

revoke all on function public.loadlink_record_nda_decline(jsonb) from public;
grant execute on function public.loadlink_record_nda_decline(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Database-level action enforcement. Clearing browser storage, modifying
--    JavaScript or calling Supabase directly does not bypass these checks.
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_require_platform_access()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_state jsonb;
begin
  if auth.role() = 'service_role' then return; end if;
  v_state := public.loadlink_access_state();
  if coalesce((v_state ->> 'allowed')::boolean, false) then return; end if;

  if (v_state ->> 'status') in ('blocked','suspended') then
    raise exception 'ACCOUNT_ACCESS_RESTRICTED';
  end if;
  raise exception 'CURRENT_NDA_ACCEPTANCE_REQUIRED';
end;
$$;

revoke all on function public.loadlink_require_platform_access() from public;
grant execute on function public.loadlink_require_platform_access() to authenticated;

create or replace function public.loadlink_enforce_platform_access_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.loadlink_require_platform_access();
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.loadlink_enforce_platform_access_trigger() from public;

-- Apply to user-created marketplace records only. System notifications and
-- audit tables are intentionally excluded.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'job_listings', 'job_boosts', 'truck_listing_details', 'vehicle_verifications',
    'verification_requests', 'driver_profiles', 'driver_documents',
    'dealership_profiles', 'dealership_staff', 'dealership_verification',
    'dealership_updates', 'dealership_leads', 'dealership_reports',
    'dealership_followers', 'loadlink_profile_follows',
    'listing_guest_threads', 'listing_guest_messages', 'listing_guest_attachments'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists loadlink_platform_access_guard on public.%I', v_table);
      execute format(
        'create trigger loadlink_platform_access_guard before insert or update or delete on public.%I for each row execute function public.loadlink_enforce_platform_access_trigger()',
        v_table
      );
    end if;
  end loop;
end $$;

-- Replace the existing capability RPC so all existing website action guards
-- receive NDA and moderation status from the same server-side source.
create or replace function public.loadlink_marketplace_capabilities()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_state jsonb := public.loadlink_access_state();
  v_allowed boolean := coalesce((v_state ->> 'allowed')::boolean, false);
  v_restricted boolean := (v_state ->> 'status') in ('blocked','suspended');
begin
  return jsonb_build_object(
    'canBrowse', v_allowed,
    'canLogin', not v_restricted,
    'canCall', v_allowed,
    'canPost', v_allowed,
    'canMessage', v_allowed,
    'hideActions', v_restricted,
    'status', v_state ->> 'status',
    'ndaAccepted', coalesce((v_state ->> 'ndaAccepted')::boolean, false),
    'requiresAcceptance', coalesce((v_state ->> 'requiresAcceptance')::boolean, false)
  );
end;
$$;

revoke all on function public.loadlink_marketplace_capabilities() from public;
grant execute on function public.loadlink_marketplace_capabilities() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Control Centre functions.
-- ---------------------------------------------------------------------------
create or replace function public.loadlink_admin_nda_dashboard(p_search text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_current public.loadlink_nda_versions%rowtype;
  v_users jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_total_users bigint := 0;
  v_accepted bigint := 0;
  v_declined bigint := 0;
  v_blocked bigint := 0;
  v_enforcement_enabled boolean := true;
begin
  if not public.loadlink_nda_is_admin() then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;

  select * into v_current
  from public.loadlink_nda_versions
  where is_active = true
  order by effective_at desc, created_at desc
  limit 1;

  select enforcement_enabled into v_enforcement_enabled
  from public.loadlink_nda_settings where singleton=true;
  v_enforcement_enabled := coalesce(v_enforcement_enabled,true);

  select count(*) into v_total_users from auth.users;
  if v_current.id is not null then
    select count(*) into v_accepted from public.loadlink_nda_acceptances where nda_version_id = v_current.id;
    select count(*) into v_declined from public.loadlink_nda_events where nda_version_id = v_current.id and event_type = 'declined';
  end if;
  select count(*) into v_blocked from public.user_moderation_profiles where status in ('blocked','suspended');

  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select a.user_id, u.email, a.accepted_name, a.accepted_at, n.version, a.accepted_at as created_at
    from public.loadlink_nda_acceptances a
    join auth.users u on u.id = a.user_id
    join public.loadlink_nda_versions n on n.id = a.nda_version_id
    order by a.accepted_at desc
    limit 25
  ) q;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc), '[]'::jsonb)
  into v_users
  from (
    select
      u.id,
      u.email,
      coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(coalesce(u.email,''),'@',1)) as display_name,
      u.created_at,
      coalesce(m.status,'active') as status,
      m.reason,
      m.suspended_until,
      case when v_current.id is null then true else exists(
        select 1 from public.loadlink_nda_acceptances a
        where a.user_id = u.id and a.nda_version_id = v_current.id
      ) end as nda_accepted
    from auth.users u
    left join public.user_moderation_profiles m on m.user_id = u.id
    where nullif(btrim(coalesce(p_search,'')),'') is null
       or u.email ilike '%' || btrim(p_search) || '%'
       or coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name','') ilike '%' || btrim(p_search) || '%'
    order by u.created_at desc
    limit 100
  ) q;

  return jsonb_build_object(
    'enforcementEnabled', v_enforcement_enabled,
    'currentNda', case when v_current.id is null then null else jsonb_build_object(
      'id', v_current.id,
      'version', v_current.version,
      'title', v_current.title,
      'summary', v_current.summary,
      'agreementText', v_current.agreement_text,
      'effectiveAt', v_current.effective_at,
      'createdAt', v_current.created_at
    ) end,
    'stats', jsonb_build_object(
      'totalUsers', v_total_users,
      'acceptedCurrent', v_accepted,
      'declinedCurrent', v_declined,
      'restrictedUsers', v_blocked
    ),
    'recentAcceptances', v_recent,
    'users', v_users
  );
end;
$$;

revoke all on function public.loadlink_admin_nda_dashboard(text) from public;
grant execute on function public.loadlink_admin_nda_dashboard(text) to authenticated;

create or replace function public.loadlink_admin_publish_nda(
  p_version text,
  p_title text,
  p_summary text,
  p_agreement_text text,
  p_effective_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.loadlink_nda_is_admin() then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_version,''))) < 3 then raise exception 'VERSION_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_title,''))) < 8 then raise exception 'TITLE_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_summary,''))) < 20 then raise exception 'SUMMARY_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_agreement_text,''))) < 1000 then raise exception 'AGREEMENT_TOO_SHORT'; end if;
  if exists(select 1 from public.loadlink_nda_versions where version = btrim(p_version)) then
    raise exception 'VERSION_ALREADY_EXISTS';
  end if;

  update public.loadlink_nda_versions set is_active=false, updated_at=now() where is_active=true;

  insert into public.loadlink_nda_versions(version,title,summary,agreement_text,effective_at,is_active,created_by)
  values (btrim(p_version),btrim(p_title),btrim(p_summary),btrim(p_agreement_text),coalesce(p_effective_at,now()),true,auth.uid())
  returning id into v_id;

  insert into public.loadlink_nda_events(user_id,nda_version_id,event_type,metadata)
  values (auth.uid(),v_id,'version_published',jsonb_build_object('version',btrim(p_version)));

  insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,reason,metadata)
  values (auth.uid(),'nda_version_published','nda_version',v_id,'Published a new agreement requiring re-acceptance',jsonb_build_object('version',btrim(p_version)));

  return public.loadlink_admin_nda_dashboard(null);
end;
$$;

revoke all on function public.loadlink_admin_publish_nda(text,text,text,text,timestamptz) from public;
grant execute on function public.loadlink_admin_publish_nda(text,text,text,text,timestamptz) to authenticated;

create or replace function public.loadlink_admin_set_nda_enforcement(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.loadlink_nda_is_admin() then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;

  insert into public.loadlink_nda_settings(singleton,enforcement_enabled,updated_by,updated_at)
  values (true,coalesce(p_enabled,true),auth.uid(),now())
  on conflict (singleton) do update
  set enforcement_enabled=excluded.enforcement_enabled,
      updated_by=excluded.updated_by,
      updated_at=now();

  insert into public.admin_audit_logs(admin_user_id,action,entity_type,reason,metadata)
  values (auth.uid(),case when coalesce(p_enabled,true) then 'nda_enforcement_enabled' else 'nda_enforcement_disabled' end,'nda_settings','Control Centre NDA enforcement changed',jsonb_build_object('enabled',p_enabled));

  return public.loadlink_admin_nda_dashboard(null);
end;
$$;

revoke all on function public.loadlink_admin_set_nda_enforcement(boolean) from public;
grant execute on function public.loadlink_admin_set_nda_enforcement(boolean) to authenticated;

create or replace function public.loadlink_admin_set_user_access(
  p_user_id uuid,
  p_status text,
  p_reason text default null,
  p_suspended_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text;
begin
  if not public.loadlink_nda_is_admin() then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if p_status not in ('active','flagged','suspended','blocked') then raise exception 'INVALID_STATUS'; end if;
  if p_status in ('blocked','suspended') and char_length(btrim(coalesce(p_reason,''))) < 4 then raise exception 'REASON_REQUIRED'; end if;
  if exists(select 1 from public.admin_users where user_id=p_user_id and is_active=true) then
    raise exception 'ACTIVE_ADMIN_ACCOUNT_PROTECTED';
  end if;

  insert into public.user_moderation_profiles(
    user_id,status,reason,suspended_until,last_action_by,last_action_at,updated_at
  ) values (
    p_user_id,p_status,nullif(btrim(coalesce(p_reason,'')),''),
    case when p_status='suspended' then p_suspended_until else null end,
    auth.uid(),now(),now()
  )
  on conflict (user_id) do update
  set status=excluded.status,
      reason=excluded.reason,
      suspended_until=excluded.suspended_until,
      last_action_by=excluded.last_action_by,
      last_action_at=now(),
      updated_at=now();

  select lower(email) into v_email from auth.users where id=p_user_id;
  if p_status='blocked' and nullif(v_email,'') is not null then
    insert into public.loadlink_blocked_identity_hashes(identity_type,identity_sha256,source_user_id,reason,blocked_by)
    values ('email',encode(digest(v_email,'sha256'),'hex'),p_user_id,nullif(btrim(coalesce(p_reason,'')),''),auth.uid())
    on conflict (identity_type,identity_sha256) do update
    set source_user_id=excluded.source_user_id,
        reason=excluded.reason,
        blocked_by=excluded.blocked_by,
        blocked_at=now();
  elsif p_status='active' then
    delete from public.loadlink_blocked_identity_hashes where source_user_id=p_user_id;
  end if;

  insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,reason,metadata)
  values (auth.uid(),'user_access_' || p_status,'user_account',p_user_id,nullif(btrim(coalesce(p_reason,'')),''),jsonb_build_object('suspendedUntil',p_suspended_until));

  return public.loadlink_admin_nda_dashboard(null);
end;
$$;

revoke all on function public.loadlink_admin_set_user_access(uuid,text,text,timestamptz) from public;
grant execute on function public.loadlink_admin_set_user_access(uuid,text,text,timestamptz) to authenticated;

-- Keep the LoadLink owner account available in the Control Centre.
insert into public.admin_users(user_id,email,display_name,role,department,is_active)
select id,lower(email),coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','LoadLink Owner'),'owner','Executive',true
from auth.users
where lower(email)=lower('loadlinksouthafrica@gmail.com')
on conflict(user_id) do update
set email=excluded.email, role='owner', department='Executive', is_active=true, updated_at=now();

-- End of LoadLink NDA + Access Control migration.
