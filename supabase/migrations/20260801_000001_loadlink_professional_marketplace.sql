-- LoadLink Professional Logistics Marketplace
-- Ordered, idempotent migration. Apply after taking a Supabase backup.
-- This migration does not modify LDE2 assets or client design files.

begin;

create extension if not exists pgcrypto;

create table if not exists public.loadlink_schema_versions (
  version text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

insert into public.loadlink_schema_versions(version, description)
values ('20260801_000001', 'Professional marketplace synchronization, security and operations foundation')
on conflict (version) do nothing;

-- ---------------------------------------------------------------------------
-- Shared status and structured marketplace fields
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.job_listings') is not null then
    alter table public.job_listings add column if not exists listing_kind text not null default 'job';
    alter table public.job_listings add column if not exists lifecycle_status text not null default 'draft';
    alter table public.job_listings add column if not exists moderation_status text not null default 'pending';
    alter table public.job_listings add column if not exists stock_status text not null default 'available';
    alter table public.job_listings add column if not exists province text;
    alter table public.job_listings add column if not exists latitude numeric(10,7);
    alter table public.job_listings add column if not exists longitude numeric(10,7);
    alter table public.job_listings add column if not exists price_amount numeric(14,2);
    alter table public.job_listings add column if not exists price_type text;
    alter table public.job_listings add column if not exists vehicle_type text;
    alter table public.job_listings add column if not exists vehicle_year integer;
    alter table public.job_listings add column if not exists brand text;
    alter table public.job_listings add column if not exists model text;
    alter table public.job_listings add column if not exists body_type text;
    alter table public.job_listings add column if not exists transmission text;
    alter table public.job_listings add column if not exists fuel_type text;
    alter table public.job_listings add column if not exists axle_configuration text;
    alter table public.job_listings add column if not exists odometer_km integer;
    alter table public.job_listings add column if not exists gvm_kg integer;
    alter table public.job_listings add column if not exists payload_kg integer;
    alter table public.job_listings add column if not exists condition text;
    alter table public.job_listings add column if not exists service_history text;
    alter table public.job_listings add column if not exists previous_owners integer;
    alter table public.job_listings add column if not exists video_url text;
    alter table public.job_listings add column if not exists verification_level text not null default 'unverified';
    alter table public.job_listings add column if not exists completion_score integer not null default 0;
    alter table public.job_listings add column if not exists idempotency_key text;
    alter table public.job_listings add column if not exists submitted_at timestamptz;
    alter table public.job_listings add column if not exists approved_at timestamptz;
    alter table public.job_listings add column if not exists renewed_at timestamptz;
    alter table public.job_listings add column if not exists expires_at timestamptz;
    alter table public.job_listings add column if not exists archived_at timestamptz;
    alter table public.job_listings add column if not exists rejection_reason text;
    alter table public.job_listings add column if not exists updated_at timestamptz not null default now();
  end if;
end $$;

create unique index if not exists job_listings_user_idempotency_uidx
  on public.job_listings(user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists job_listings_marketplace_search_idx
  on public.job_listings(listing_kind, moderation_status, lifecycle_status, stock_status, created_at desc);
create index if not exists job_listings_location_idx on public.job_listings(province, city);
create index if not exists job_listings_vehicle_idx on public.job_listings(vehicle_type, brand, model, vehicle_year);
create index if not exists job_listings_price_idx on public.job_listings(price_amount);

-- ---------------------------------------------------------------------------
-- Marketplace synchronization and operational records
-- ---------------------------------------------------------------------------

create table if not exists public.marketplace_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index if not exists marketplace_events_entity_idx on public.marketplace_events(entity_type, entity_id, created_at desc);
create index if not exists marketplace_events_type_idx on public.marketplace_events(event_type, created_at desc);

create table if not exists public.marketplace_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default ('LL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  case_type text not null,
  entity_type text not null,
  entity_id text not null,
  reporter_user_id uuid references auth.users(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  priority text not null default 'normal',
  status text not null default 'open',
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  resolution text,
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketplace_cases_queue_idx on public.marketplace_cases(status, priority, created_at);
create index if not exists marketplace_cases_entity_idx on public.marketplace_cases(entity_type, entity_id);

create table if not exists public.idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  idempotency_key text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (user_id, operation, idempotency_key)
);

create table if not exists public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  completion_score integer not null default 0 check (completion_score between 0 and 100),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists listing_drafts_owner_idx on public.listing_drafts(user_id, updated_at desc);

create table if not exists public.listing_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text,
  bucket text not null,
  object_paths text[] not null default '{}',
  status text not null default 'open',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  marketplace_area text not null,
  filters jsonb not null default '{}'::jsonb,
  alerts_enabled boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saved_searches_owner_idx on public.saved_searches(user_id, created_at desc);

create table if not exists public.vehicle_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.saved_marketplace_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null default now(),
  primary key(user_id, entity_type, entity_id)
);

create table if not exists public.job_interests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  proposed_rate numeric(14,2),
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, applicant_user_id)
);

create table if not exists public.employer_shortlists (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  driver_profile_id uuid not null,
  notes text,
  status text not null default 'saved',
  created_at timestamptz not null default now(),
  unique(employer_user_id, driver_profile_id)
);

create table if not exists public.work_completion_records (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.job_listings(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  counterparty_user_id uuid references auth.users(id) on delete set null,
  completion_status text not null default 'pending_confirmation',
  completed_at timestamptz,
  proof_paths text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.dealership_reviews (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  related_listing_id uuid references public.job_listings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  moderation_status text not null default 'pending',
  dealership_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique(dealership_id, reviewer_user_id, related_listing_id)
);

create table if not exists public.dealership_lead_assignments (
  lead_id uuid primary key,
  assigned_staff_user_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'new',
  next_action_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.dealership_campaigns (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('SUP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  requester_user_id uuid references auth.users(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  description text not null,
  related_entity_type text,
  related_entity_id text,
  status text not null default 'open',
  priority text not null default 'normal',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_pages (
  slug text primary key,
  title text not null,
  body_markdown text not null,
  status text not null default 'draft',
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_templates (
  template_key text primary key,
  title_template text not null,
  body_template text not null,
  safe_action_path text,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payment_reference text,
  user_id uuid references auth.users(id) on delete set null,
  amount_cents bigint,
  currency text not null default 'ZAR',
  signature_verified boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table if not exists public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_reference text not null,
  reason text not null,
  status text not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.platform_health_events (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  status text not null,
  latency_ms integer,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('support','moderator','finance','operations','admin','owner')),
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_trail (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_trail_entity_idx on public.admin_audit_trail(entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions and protected administration model
-- ---------------------------------------------------------------------------

create or replace function public.loadlink_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_allowed boolean := false;
begin
  if auth.uid() is null then return false; end if;
  if to_regclass('public.admin_users') is not null then
    execute 'select exists(select 1 from public.admin_users where user_id=$1 and coalesce(active,true)=true)'
      into v_allowed using auth.uid();
  end if;
  return coalesce(v_allowed,false);
exception when undefined_column then
  execute 'select exists(select 1 from public.admin_users where user_id=$1)' into v_allowed using auth.uid();
  return coalesce(v_allowed,false);
end $$;

create or replace function public.loadlink_is_trusted_server()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt()->>'role' = 'service_role', false);
$$;

create or replace function public.loadlink_is_staff(required_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.loadlink_is_trusted_server()
    or lower(coalesce(auth.jwt()->>'email','')) = 'loadlinksouthafrica@gmail.com'
    or exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid()
        and sr.active = true
        and (required_roles is null or sr.role = any(required_roles))
    )
    or public.loadlink_is_admin();
$$;

revoke all on function public.loadlink_is_staff(text[]) from public;
grant execute on function public.loadlink_is_staff(text[]) to authenticated;

create or replace function public.loadlink_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.loadlink_emit_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.marketplace_events(event_type, entity_type, entity_id, actor_user_id, payload)
  values (p_event_type, p_entity_type, p_entity_id, auth.uid(), coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.loadlink_emit_event(text,text,text,jsonb) from public;
grant execute on function public.loadlink_emit_event(text,text,text,jsonb) to authenticated;

create or replace function public.loadlink_create_moderation_case(
  p_entity_type text,
  p_entity_id text,
  p_reason text,
  p_case_type text default 'report',
  p_evidence jsonb default '[]'::jsonb
)
returns table(id uuid, case_number text)
language plpgsql
security definer
set search_path = public
as $$
declare v_case public.marketplace_cases%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_reason,''))) < 8 then raise exception 'Please provide a useful reason'; end if;
  insert into public.marketplace_cases(case_type, entity_type, entity_id, reporter_user_id, reason, evidence)
  values (p_case_type, p_entity_type, p_entity_id, auth.uid(), left(trim(p_reason), 2000), coalesce(p_evidence,'[]'::jsonb))
  returning * into v_case;
  perform public.loadlink_emit_event('case.created', p_entity_type, p_entity_id, jsonb_build_object('case_id',v_case.id));
  return query select v_case.id, v_case.case_number;
end $$;

revoke all on function public.loadlink_create_moderation_case(text,text,text,text,jsonb) from public;
grant execute on function public.loadlink_create_moderation_case(text,text,text,text,jsonb) to authenticated;

create or replace function public.loadlink_delete_my_listing(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.job_listings where id = p_listing_id and user_id = auth.uid();
  v_deleted := found;
  if v_deleted then perform public.loadlink_emit_event('listing.deleted','listing',p_listing_id::text,'{}'); end if;
  return v_deleted;
end $$;

create or replace function public.loadlink_set_my_listing_status(p_listing_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('draft','pending','active','paused','reserved','sold','filled','closed','expired','archived') then
    raise exception 'Invalid status';
  end if;
  update public.job_listings
  set lifecycle_status = p_status,
      status = case when p_status in ('active','paused','filled','closed') then p_status else status end,
      stock_status = case when p_status in ('reserved','sold') then p_status else stock_status end,
      updated_at = now()
  where id = p_listing_id and user_id = auth.uid();
  if found then
    perform public.loadlink_emit_event('listing.status_changed','listing',p_listing_id::text,jsonb_build_object('status',p_status));
    return true;
  end if;
  return false;
end $$;

create or replace function public.loadlink_update_my_listing(p_listing_id uuid, p_changes jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_sensitive_change boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_sensitive_change := p_changes ?| array['title','description','rate','price_amount','contact_number','photos','vehicle_year','brand','model','condition'];
  update public.job_listings
  set title = coalesce(nullif(trim(p_changes->>'title'),''), title),
      city = coalesce(nullif(trim(p_changes->>'city'),''), city),
      rate = coalesce(nullif(trim(p_changes->>'rate'),''), rate),
      description = coalesce(nullif(trim(p_changes->>'description'),''), description),
      contact_number = coalesce(nullif(trim(p_changes->>'contact_number'),''), contact_number),
      lifecycle_status = case when v_sensitive_change then 'pending' else lifecycle_status end,
      moderation_status = case when v_sensitive_change then 'pending' else moderation_status end,
      submitted_at = case when v_sensitive_change then now() else submitted_at end,
      updated_at = now()
  where id = p_listing_id and user_id = auth.uid();
  if found then
    perform public.loadlink_emit_event('listing.updated','listing',p_listing_id::text,jsonb_build_object('resubmitted',v_sensitive_change));
    return true;
  end if;
  return false;
end $$;

create or replace function public.loadlink_get_my_listing_analytics(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.job_listings where id=p_listing_id and user_id=auth.uid() and package_type in ('pro','dealer')) then
    raise exception 'Pro or dealership analytics required';
  end if;
  select jsonb_build_object(
    'total_views', coalesce((select view_count from public.job_listings where id=p_listing_id),0),
    'unique_viewers', case when to_regclass('public.job_view_events') is null then 0 else 0 end,
    'last_viewed_at', (select last_viewed_at from public.job_listings where id=p_listing_id),
    'daily_views', '[]'::jsonb,
    'devices', '[]'::jsonb,
    'sources', '[]'::jsonb
  ) into v_result;
  return v_result;
end $$;

revoke all on function public.loadlink_get_my_listing_analytics(uuid) from public;
grant execute on function public.loadlink_get_my_listing_analytics(uuid) to authenticated;

revoke all on function public.loadlink_delete_my_listing(uuid) from public;
revoke all on function public.loadlink_set_my_listing_status(uuid,text) from public;
revoke all on function public.loadlink_update_my_listing(uuid,jsonb) from public;
grant execute on function public.loadlink_delete_my_listing(uuid) to authenticated;
grant execute on function public.loadlink_set_my_listing_status(uuid,text) to authenticated;
grant execute on function public.loadlink_update_my_listing(uuid,jsonb) to authenticated;

create or replace function public.loadlink_review_listing(
  p_listing_id uuid,
  p_decision text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_before jsonb; v_after jsonb; v_owner uuid;
begin
  if not public.loadlink_is_staff(array['moderator','operations','admin','owner']) then raise exception 'Forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select to_jsonb(j), user_id into v_before, v_owner from public.job_listings j where id=p_listing_id for update;
  if v_before is null then return false; end if;
  if p_decision='rejected' and length(trim(coalesce(p_reason,''))) < 5 then raise exception 'A rejection reason is required'; end if;
  update public.job_listings set
    moderation_status=p_decision,
    lifecycle_status=case when p_decision='approved' then 'active' else 'rejected' end,
    status=case when p_decision='approved' then 'active' else 'rejected' end,
    rejection_reason=case when p_decision='rejected' then trim(p_reason) else null end,
    approved_at=case when p_decision='approved' then now() else approved_at end,
    updated_at=now()
  where id=p_listing_id
  returning to_jsonb(job_listings.*) into v_after;
  if to_regclass('public.user_notifications') is not null and v_owner is not null then
    insert into public.user_notifications(user_id,title,message,type,action_url)
    values(v_owner,
      case when p_decision='approved' then 'Listing approved' else 'Listing needs changes' end,
      case when p_decision='approved' then 'Your listing is now visible on LoadLink.' else trim(p_reason) end,
      'listing_review', '/my-posts');
  end if;
  insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'listing.'||p_decision,'listing',p_listing_id::text,v_before,v_after);
  perform public.loadlink_emit_event('listing.'||p_decision,'listing',p_listing_id::text,jsonb_build_object('reason',p_reason));
  return true;
end $$;

revoke all on function public.loadlink_review_listing(uuid,text,text) from public;
grant execute on function public.loadlink_review_listing(uuid,text,text) to authenticated;

create or replace function public.loadlink_review_marketplace_record(
  p_entity_type text,
  p_entity_id uuid,
  p_decision text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_owner uuid;
  v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if not public.loadlink_is_staff(array['support','moderator','finance','operations','admin','owner']) then raise exception 'Forbidden'; end if;
  if p_entity_type not in ('dealership','driver','review','case','ticket','fraud') then raise exception 'Unsupported record type'; end if;
  if p_decision in ('rejected','resolved','escalated') and length(coalesce(v_reason,''))<5 then
    raise exception 'A clear reason or resolution is required';
  end if;

  if p_entity_type='dealership' then
    if p_decision not in ('approved','rejected','suspended') then raise exception 'Invalid dealership decision'; end if;
    select to_jsonb(d),d.owner_user_id into v_before,v_owner from public.dealership_profiles d where d.id=p_entity_id for update;
    if v_before is null then return false; end if;
    update public.dealership_profiles set
      verification_status=p_decision,
      profile_status=case when p_decision='approved' then 'active' else p_decision end,
      is_public=(p_decision='approved'),
      approved_at=case when p_decision='approved' then now() else approved_at end,
      rejection_reason=case when p_decision='rejected' then v_reason else null end,
      verification_reason=case when p_decision in ('rejected','suspended') then v_reason else null end,
      updated_at=now()
    where id=p_entity_id returning to_jsonb(dealership_profiles.*) into v_after;
  elsif p_entity_type='driver' then
    if p_decision not in ('approved','rejected') then raise exception 'Invalid driver decision'; end if;
    select to_jsonb(d),d.user_id into v_before,v_owner from public.driver_profiles d where d.id=p_entity_id for update;
    if v_before is null then return false; end if;
    update public.driver_profiles set
      status=p_decision,
      profile_status=case when p_decision='approved' then 'active' else 'rejected' end,
      verification_level=case when p_decision='approved' then 'documents_checked' else verification_level end,
      review_reason=case when p_decision='rejected' then v_reason else null end,
      approved_at=case when p_decision='approved' then now() else null end,
      reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now()
    where id=p_entity_id returning to_jsonb(driver_profiles.*) into v_after;
  elsif p_entity_type='review' then
    if p_decision not in ('approved','rejected') then raise exception 'Invalid review decision'; end if;
    select to_jsonb(r) into v_before from public.dealership_reviews r where r.id=p_entity_id for update;
    if v_before is null then return false; end if;
    update public.dealership_reviews set moderation_status=p_decision where id=p_entity_id returning to_jsonb(dealership_reviews.*) into v_after;
  elsif p_entity_type='case' then
    if p_decision not in ('open','in_progress','resolved','closed') then raise exception 'Invalid case status'; end if;
    select to_jsonb(c) into v_before from public.marketplace_cases c where c.id=p_entity_id for update;
    if v_before is null then return false; end if;
    update public.marketplace_cases set status=p_decision,resolution=case when p_decision in ('resolved','closed') then v_reason else resolution end,resolved_at=case when p_decision in ('resolved','closed') then now() else null end,updated_at=now() where id=p_entity_id returning to_jsonb(marketplace_cases.*) into v_after;
  elsif p_entity_type='ticket' then
    if p_decision not in ('open','in_progress','resolved','closed') then raise exception 'Invalid ticket status'; end if;
    select to_jsonb(t) into v_before from public.support_tickets t where t.id=p_entity_id for update;
    if v_before is null then return false; end if;
    update public.support_tickets set status=p_decision,updated_at=now() where id=p_entity_id returning to_jsonb(support_tickets.*) into v_after;
  else
    if p_decision not in ('open','reviewed','dismissed','escalated') then raise exception 'Invalid fraud status'; end if;
    select to_jsonb(f) into v_before from public.marketplace_fraud_signals f where f.id=p_entity_id for update;
    if v_before is null then return false; end if;
    update public.marketplace_fraud_signals set status=p_decision,reviewed_at=case when p_decision<>'open' then now() else null end,reviewed_by=case when p_decision<>'open' then auth.uid() else null end where id=p_entity_id returning to_jsonb(marketplace_fraud_signals.*) into v_after;
  end if;

  if v_owner is not null and p_entity_type in ('dealership','driver') and to_regclass('public.user_notifications') is not null then
    insert into public.user_notifications(user_id,type,title,message,action_url,entity_type,entity_id)
    values(v_owner,p_entity_type||'_review',
      case when p_decision='approved' then initcap(p_entity_type)||' approved' else initcap(p_entity_type)||' review update' end,
      case when p_decision='approved' then 'Your '||p_entity_type||' is approved and synchronized across LoadLink.' else coalesce(v_reason,'The status of your '||p_entity_type||' changed.') end,
      case when p_entity_type='dealership' then '/dealer' else '/driver-profile' end,
      p_entity_type,p_entity_id);
  end if;
  insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),p_entity_type||'.'||p_decision,p_entity_type,p_entity_id::text,v_before,v_after);
  perform public.loadlink_emit_event(p_entity_type||'.'||p_decision,p_entity_type,p_entity_id::text,jsonb_build_object('reason',v_reason));
  return true;
end $$;

revoke all on function public.loadlink_review_marketplace_record(text,uuid,text,text) from public;
grant execute on function public.loadlink_review_marketplace_record(text,uuid,text,text) to authenticated;


create or replace function public.loadlink_send_admin_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_action_path text default '/account'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid; v_path text;
begin
  if not public.loadlink_is_staff(array['support','moderator','finance','operations','admin','owner']) then raise exception 'Forbidden'; end if;
  if p_user_id is null or length(trim(coalesce(p_title,'')))<3 or length(trim(coalesce(p_message,'')))<5 then raise exception 'A recipient, title and message are required'; end if;
  v_path:=case when coalesce(p_action_path,'') ~ '^/(?!/)[A-Za-z0-9/_?=&.%-]*$' then p_action_path else '/account' end;
  insert into public.user_notifications(user_id,type,title,message,action_url)
  values(p_user_id,'admin_message',left(trim(p_title),100),left(trim(p_message),1000),v_path)
  returning id into v_id;
  insert into public.admin_audit_trail(actor_user_id,action,entity_type,entity_id,after_data)
  values(auth.uid(),'notification.sent','user',p_user_id::text,jsonb_build_object('title',left(trim(p_title),100),'action_url',v_path));
  perform public.loadlink_emit_event('notification.sent','user',p_user_id::text,jsonb_build_object('notification_id',v_id,'action_url',v_path));
  return v_id;
end $$;

revoke all on function public.loadlink_send_admin_notification(uuid,text,text,text) from public;
grant execute on function public.loadlink_send_admin_notification(uuid,text,text,text) to authenticated;

create or replace function public.loadlink_apply_verified_payment_event(p_payment_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_event public.payment_events%rowtype;
begin
  select * into v_event from public.payment_events where id=p_payment_event_id for update;
  if v_event.id is null or not v_event.signature_verified then raise exception 'Verified payment event required'; end if;
  if v_event.processed_at is not null then return true; end if;
  -- Provider-specific activation is intentionally driven only by this verified event.
  if to_regclass('public.admin_payments') is not null and v_event.payment_reference is not null then
    update public.admin_payments
      set status='paid', paid_at=coalesce(paid_at,now())
      where reference=v_event.payment_reference or id::text=v_event.payment_reference;
  end if;
  update public.payment_events set processed_at=now(), processing_error=null where id=p_payment_event_id;
  perform public.loadlink_emit_event('payment.verified','payment',p_payment_event_id::text,jsonb_build_object('reference',v_event.payment_reference));
  return true;
exception when others then
  update public.payment_events set processing_error=sqlerrm where id=p_payment_event_id;
  raise;
end $$;

revoke all on function public.loadlink_apply_verified_payment_event(uuid) from public;
grant execute on function public.loadlink_apply_verified_payment_event(uuid) to service_role;

-- Dealership profiles are account-owned, plan-gated and staff-approved.
create or replace function public.loadlink_guard_dealership_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_has_dealer_plan boolean := false;
begin
  if public.loadlink_is_staff(array['moderator','operations','admin','owner']) then return new; end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select exists(
    select 1 from public.user_subscriptions s
    where s.user_id=auth.uid()
      and s.plan_code='dealer'
      and s.status='active'
      and coalesce(s.ends_at,s.renews_at,now()+interval '1 day') > now()
  ) into v_has_dealer_plan;
  if not v_has_dealer_plan then
    raise exception 'An active Dealer subscription is required';
  end if;

  if tg_op='INSERT' then
    new.owner_user_id:=auth.uid();
    new.verification_status:='pending';
    new.is_public:=false;
    new.is_featured:=false;
    new.trust_score:=0;
    new.approved_at:=null;
    new.rejection_reason:=null;
    new.verification_reason:=null;
    new.profile_status:=coalesce(nullif(new.profile_status,''),'pending');
    return new;
  end if;

  if old.owner_user_id is distinct from auth.uid() or new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'A dealership profile must remain linked to its owner account';
  end if;
  if new.verification_status is distinct from old.verification_status
     or new.approved_at is distinct from old.approved_at
     or new.rejection_reason is distinct from old.rejection_reason
     or new.verification_reason is distinct from old.verification_reason
     or new.is_public is distinct from old.is_public
     or new.is_featured is distinct from old.is_featured
     or new.trust_score is distinct from old.trust_score
     or new.average_response_minutes is distinct from old.average_response_minutes then
    raise exception 'Approval and trust fields can only be changed by authorized LoadLink staff';
  end if;
  return new;
end $$;

do $$ begin
  if to_regclass('public.dealership_profiles') is not null then
    alter table public.dealership_profiles add column if not exists profile_status text not null default 'draft';
    alter table public.dealership_profiles add column if not exists province text;
    alter table public.dealership_profiles add column if not exists verification_status text not null default 'unverified';
    alter table public.dealership_profiles add column if not exists approved_at timestamptz;
    alter table public.dealership_profiles add column if not exists rejection_reason text;
    alter table public.dealership_profiles add column if not exists response_minutes integer;
    drop trigger if exists dealership_protect_admin_fields on public.dealership_profiles;
    drop trigger if exists dealership_guard_profile on public.dealership_profiles;
    create trigger dealership_guard_profile before insert or update on public.dealership_profiles
      for each row execute function public.loadlink_guard_dealership_profile();
  end if;
end $$;

-- Driver lifecycle and document expiry.
do $$ begin
  if to_regclass('public.driver_profiles') is not null then
    alter table public.driver_profiles add column if not exists availability_status text not null default 'available';
    alter table public.driver_profiles add column if not exists licence_expiry date;
    alter table public.driver_profiles add column if not exists prdp_expiry date;
    alter table public.driver_profiles add column if not exists verification_level text not null default 'profile_only';
    alter table public.driver_profiles add column if not exists profile_status text not null default 'draft';
    alter table public.driver_profiles add column if not exists profile_views bigint not null default 0;
    alter table public.driver_profiles add column if not exists contact_reveal_count bigint not null default 0;
  end if;
end $$;

-- Notifications may only navigate within LoadLink.
do $$ begin
  if to_regclass('public.user_notifications') is not null then
    alter table public.user_notifications drop constraint if exists user_notifications_safe_action_url;
    alter table public.user_notifications add constraint user_notifications_safe_action_url
      check (action_url is null or (left(action_url,1)='/' and left(action_url,2) <> '//')) not valid;
  end if;
end $$;

-- Public driver avatars are display-only. Private phone, email and documents stay off the public view.
do $$ begin
  if to_regclass('public.driver_profiles') is not null then
    alter table public.driver_profiles add column if not exists profile_image_url text;
  end if;
end $$;

create or replace function public.loadlink_set_driver_profile_image(p_url text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_url text:=left(trim(coalesce(p_url,'')),1200);
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if v_url <> '' and left(v_url,8) <> 'https://' then raise exception 'Invalid profile image URL'; end if;
  update public.driver_profiles set profile_image_url=nullif(v_url,''),updated_at=now() where user_id=v_user;
  if not found then raise exception 'Create your driver profile before adding an image'; end if;
  return nullif(v_url,'');
end $$;
revoke all on function public.loadlink_set_driver_profile_image(text) from public;
grant execute on function public.loadlink_set_driver_profile_image(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Public-safe views (never expose ownership keys, private contacts or documents)
-- ---------------------------------------------------------------------------

drop view if exists public.loadlink_public_listings;
create view public.loadlink_public_listings as
select
  j.id, j.title, j.city, j.province, j.vehicle_group, j.rate,
  j.price_amount, j.price_type, j.description, j.photos, j.sponsored,
  j.package_type, j.created_at, j.updated_at, j.listing_kind,
  j.lifecycle_status, j.moderation_status, j.stock_status, j.expires_at,
  j.vehicle_type, j.vehicle_year, j.brand, j.model, j.body_type,
  j.transmission, j.fuel_type, j.axle_configuration, j.odometer_km,
  j.gvm_kg, j.payload_kg, j.condition, j.service_history, j.previous_owners,
  j.video_url, j.verification_level, j.completion_score,
  j.dealership_id, j.posted_by
from public.job_listings j
where coalesce(j.moderation_status,'approved')='approved'
  and coalesce(j.lifecycle_status,j.status,'active')='active'
  and coalesce(j.stock_status,'available') not in ('sold','archived')
  and (j.expires_at is null or j.expires_at > now());

revoke all on public.loadlink_public_listings from public;
grant select on public.loadlink_public_listings to anon, authenticated;

-- Views for optional modules are created only when base tables exist.
do $$
begin
  if to_regclass('public.dealership_profiles') is not null then
    execute 'drop view if exists public.loadlink_public_dealerships';
    execute $v$create view public.loadlink_public_dealerships as
      select d.id, d.slug, d.name, d.profile_image_url, d.cover_image_url, d.short_bio, d.business_description,
             d.physical_location, d.province, d.contact_email, d.phone_number, d.whatsapp_number, d.website_url, d.trading_hours,
             d.year_established, d.verification_status, d.average_response_minutes, d.trust_score, d.is_featured, d.created_at,
             (select count(*) from public.job_listings j where j.dealership_id=d.id and j.listing_kind='vehicle' and coalesce(j.moderation_status,'approved')='approved' and coalesce(j.stock_status,'available')='available')::bigint as active_stock_count
      from public.dealership_profiles d
      where d.is_public=true and d.verification_status='approved'$v$;
    execute 'revoke all on public.loadlink_public_dealerships from public';
    execute 'grant select on public.loadlink_public_dealerships to anon, authenticated';
  end if;
  if to_regclass('public.driver_profiles') is not null then
    execute 'drop view if exists public.loadlink_public_driver_profiles';
    execute $v$create view public.loadlink_public_driver_profiles as
      select id, full_name, profile_image_url, headline, city, province, years_experience, licence_code,
             vehicle_types, route_experience, languages, availability, bio, verification_level,
             profile_views, created_at, updated_at
      from public.driver_profiles
      where status='approved'$v$;
    execute 'revoke all on public.loadlink_public_driver_profiles from public';
    execute 'grant select on public.loadlink_public_driver_profiles to anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: owners control their records; public reads use safe views; staff review.
-- ---------------------------------------------------------------------------

alter table public.marketplace_events enable row level security;
alter table public.marketplace_cases enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.listing_drafts enable row level security;
alter table public.listing_upload_sessions enable row level security;
alter table public.saved_searches enable row level security;
alter table public.vehicle_comparisons enable row level security;
alter table public.saved_marketplace_items enable row level security;
alter table public.job_interests enable row level security;
alter table public.employer_shortlists enable row level security;
alter table public.work_completion_records enable row level security;
alter table public.dealership_reviews enable row level security;
alter table public.dealership_lead_assignments enable row level security;
alter table public.dealership_campaigns enable row level security;
alter table public.quick_replies enable row level security;
alter table public.support_tickets enable row level security;
alter table public.content_pages enable row level security;
alter table public.notification_templates enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_disputes enable row level security;
alter table public.platform_health_events enable row level security;
alter table public.staff_roles enable row level security;
alter table public.admin_audit_trail enable row level security;

do $$
declare t text;
begin
  foreach t in array array['idempotency_keys','listing_drafts','listing_upload_sessions','saved_searches','vehicle_comparisons','saved_marketplace_items','quick_replies'] loop
    execute format('drop policy if exists %I on public.%I', t||'_owner_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid())', t||'_owner_all', t);
  end loop;
end $$;

drop policy if exists marketplace_cases_reporter_read on public.marketplace_cases;
create policy marketplace_cases_reporter_read on public.marketplace_cases for select to authenticated
  using (reporter_user_id=auth.uid() or public.loadlink_is_staff(null));
drop policy if exists marketplace_cases_staff_all on public.marketplace_cases;
create policy marketplace_cases_staff_all on public.marketplace_cases for all to authenticated
  using (public.loadlink_is_staff(null)) with check (public.loadlink_is_staff(null));

drop policy if exists marketplace_events_staff_read on public.marketplace_events;
create policy marketplace_events_staff_read on public.marketplace_events for select to authenticated using (public.loadlink_is_staff(null));

drop policy if exists job_interests_applicant on public.job_interests;
create policy job_interests_applicant on public.job_interests for all to authenticated
  using (applicant_user_id=auth.uid()) with check (applicant_user_id=auth.uid());
drop policy if exists job_interests_owner_read on public.job_interests;
create policy job_interests_owner_read on public.job_interests for select to authenticated using (
  exists(select 1 from public.job_listings j where j.id=listing_id and j.user_id=auth.uid())
);

drop policy if exists employer_shortlists_owner on public.employer_shortlists;
create policy employer_shortlists_owner on public.employer_shortlists for all to authenticated
  using (employer_user_id=auth.uid()) with check (employer_user_id=auth.uid());

drop policy if exists dealership_reviews_public_approved on public.dealership_reviews;
create policy dealership_reviews_public_approved on public.dealership_reviews for select to anon, authenticated using (moderation_status='approved');
drop policy if exists dealership_reviews_author_insert on public.dealership_reviews;
create policy dealership_reviews_author_insert on public.dealership_reviews for insert to authenticated with check (reviewer_user_id=auth.uid());

drop policy if exists support_tickets_requester on public.support_tickets;
create policy support_tickets_requester on public.support_tickets for select to authenticated
  using (requester_user_id=auth.uid() or public.loadlink_is_staff(null));
drop policy if exists support_tickets_requester_insert on public.support_tickets;
create policy support_tickets_requester_insert on public.support_tickets for insert to authenticated with check (requester_user_id=auth.uid());
drop policy if exists support_tickets_staff_all on public.support_tickets;
create policy support_tickets_staff_all on public.support_tickets for all to authenticated
  using (public.loadlink_is_staff(null)) with check (public.loadlink_is_staff(null));

drop policy if exists content_pages_public_published on public.content_pages;
create policy content_pages_public_published on public.content_pages for select to anon, authenticated using (status='published');
drop policy if exists content_pages_staff_all on public.content_pages;
create policy content_pages_staff_all on public.content_pages for all to authenticated
  using (public.loadlink_is_staff(array['operations','admin','owner'])) with check (public.loadlink_is_staff(array['operations','admin','owner']));

do $$
declare t text;
begin
  foreach t in array array['notification_templates','platform_health_events','admin_audit_trail','staff_roles','payment_events','dealership_lead_assignments'] loop
    execute format('drop policy if exists %I on public.%I', t||'_staff_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.loadlink_is_staff(null)) with check (public.loadlink_is_staff(null))', t||'_staff_all', t);
  end loop;
end $$;

drop policy if exists payment_disputes_owner_read on public.payment_disputes;
create policy payment_disputes_owner_read on public.payment_disputes for select to authenticated using (user_id=auth.uid() or public.loadlink_is_staff(null));
drop policy if exists payment_disputes_owner_insert on public.payment_disputes;
create policy payment_disputes_owner_insert on public.payment_disputes for insert to authenticated with check (user_id=auth.uid());

create table if not exists public.chat_blocks (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(conversation_id, blocker_user_id, blocked_user_id)
);
alter table public.chat_blocks enable row level security;
drop policy if exists chat_blocks_participant on public.chat_blocks;
create policy chat_blocks_participant on public.chat_blocks for select to authenticated
  using (blocker_user_id=auth.uid() or blocked_user_id=auth.uid());

create or replace function public.loadlink_start_listing_conversation(p_listing_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_owner uuid; v_title text; v_id uuid; v_my_name text; v_owner_name text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select user_id,title,posted_by into v_owner,v_title,v_owner_name from public.job_listings
    where id=p_listing_id and coalesce(moderation_status,'approved')='approved';
  if v_owner is null then raise exception 'Listing owner is unavailable'; end if;
  if v_owner=auth.uid() then raise exception 'You cannot message your own listing'; end if;
  select c.id into v_id from public.chat_conversations c
    join public.chat_participants a on a.conversation_id=c.id and a.user_id=auth.uid()
    join public.chat_participants b on b.conversation_id=c.id and b.user_id=v_owner
    where c.listing_id=p_listing_id limit 1;
  if v_id is null then
    insert into public.chat_conversations(listing_id,listing_title) values(p_listing_id,v_title) returning id into v_id;
    select coalesce(full_name,'LoadLink user') into v_my_name from public.profiles where id=auth.uid();
    insert into public.chat_participants(conversation_id,user_id,display_name) values
      (v_id,auth.uid(),coalesce(v_my_name,'LoadLink user')),
      (v_id,v_owner,coalesce(nullif(v_owner_name,''),'Listing owner'));
  end if;
  perform public.loadlink_emit_event('conversation.opened','listing',p_listing_id::text,jsonb_build_object('conversation_id',v_id));
  return v_id;
end $$;
revoke all on function public.loadlink_start_listing_conversation(uuid) from public;
grant execute on function public.loadlink_start_listing_conversation(uuid) to authenticated;

create or replace function public.loadlink_get_conversation_block(p_conversation_id uuid)
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'blocked_by_me', exists(select 1 from public.chat_blocks where conversation_id=p_conversation_id and blocker_user_id=auth.uid()),
    'blocked_by_other', exists(select 1 from public.chat_blocks where conversation_id=p_conversation_id and blocked_user_id=auth.uid())
  ) where public.is_chat_participant(p_conversation_id);
$$;
create or replace function public.loadlink_set_conversation_block(p_conversation_id uuid,p_block boolean)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_other uuid;
begin
  if not public.is_chat_participant(p_conversation_id) then raise exception 'Not authorised'; end if;
  select user_id into v_other from public.chat_participants where conversation_id=p_conversation_id and user_id<>auth.uid() limit 1;
  if p_block then
    insert into public.chat_blocks(conversation_id,blocker_user_id,blocked_user_id) values(p_conversation_id,auth.uid(),v_other) on conflict do nothing;
  else
    delete from public.chat_blocks where conversation_id=p_conversation_id and blocker_user_id=auth.uid();
  end if;
  perform public.loadlink_emit_event(case when p_block then 'conversation.blocked' else 'conversation.unblocked' end,'conversation',p_conversation_id::text,'{}');
  return true;
end $$;
revoke all on function public.loadlink_get_conversation_block(uuid) from public;
revoke all on function public.loadlink_set_conversation_block(uuid,boolean) from public;
grant execute on function public.loadlink_get_conversation_block(uuid) to authenticated;
grant execute on function public.loadlink_set_conversation_block(uuid,boolean) to authenticated;

-- Replace the message function so blocking and limits are always enforced server-side.
create or replace function public.send_chat_message(p_conversation_id uuid,p_body text,p_file_path text default null,p_file_name text default null,p_file_type text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_remaining integer; v_id uuid;
begin
 if not public.is_chat_participant(p_conversation_id) then raise exception 'Not authorised'; end if;
 if exists(select 1 from public.chat_blocks where conversation_id=p_conversation_id and (blocker_user_id=auth.uid() or blocked_user_id=auth.uid())) then
   raise exception 'This conversation is blocked';
 end if;
 v_remaining:=public.get_daily_message_remaining();
 if v_remaining<=0 then raise exception 'Daily message limit reached'; end if;
 if coalesce(trim(p_body),'')='' and p_file_path is null then raise exception 'Empty message'; end if;
 insert into public.chat_messages(conversation_id,sender_id,body,file_path,file_name,file_type)
 values(p_conversation_id,auth.uid(),left(coalesce(trim(p_body),''),4000),p_file_path,p_file_name,p_file_type) returning id into v_id;
 update public.chat_conversations set updated_at=now() where id=p_conversation_id;
 update public.profiles set last_seen=now() where id=auth.uid();
 perform public.loadlink_emit_event('message.sent','conversation',p_conversation_id::text,jsonb_build_object('message_id',v_id));
 return jsonb_build_object('id',v_id,'remaining',greatest(0,v_remaining-1));
end $$;

insert into storage.buckets(id,name,public,file_size_limit)
values('chat-attachments','chat-attachments',false,8388608)
on conflict(id) do update set public=false,file_size_limit=8388608;

drop policy if exists "chat participants upload files" on storage.objects;
drop policy if exists "chat participants read files" on storage.objects;
drop policy if exists loadlink_chat_participant_upload on storage.objects;
drop policy if exists loadlink_chat_participant_read on storage.objects;
create policy loadlink_chat_participant_upload on storage.objects for insert to authenticated
  with check(bucket_id='chat-attachments' and public.is_chat_participant(((storage.foldername(name))[1])::uuid));
create policy loadlink_chat_participant_read on storage.objects for select to authenticated
  using(bucket_id='chat-attachments' and public.is_chat_participant(((storage.foldername(name))[1])::uuid));

-- Existing chat becomes account-participant only. Legacy guest functions remain in history
-- but are revoked so browser-held bearer keys cannot authorize private conversations.
do $$
begin
  if to_regclass('public.chat_participants') is not null then
    alter table public.chat_participants enable row level security;
  end if;
  if to_regclass('public.chat_messages') is not null then
    alter table public.chat_messages enable row level security;
  end if;
end $$;

do $$ declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname ilike '%guest_chat%' or p.proname in ('claim_guest_listings','delete_my_listing','set_my_listing_status','update_my_listing'))
  loop
    execute format('revoke all on function %I.%I(%s) from anon', r.nspname,r.proname,r.args);
  end loop;
end $$;

-- Sensitive buckets: deny public reads and require authenticated user-prefixed paths.
insert into storage.buckets(id,name,public)
values
  ('verification-documents','verification-documents',false),
  ('dealership-documents','dealership-documents',false),
  ('vehicle-verification','vehicle-verification',false),
  ('loadlink-driver-documents','loadlink-driver-documents',false)
on conflict(id) do update set public=false;

-- Remove only policies created by this migration name before re-creating them.
do $$ declare b text;
begin
  foreach b in array array['verification-documents','dealership-documents','vehicle-verification','loadlink-driver-documents'] loop
    execute format('drop policy if exists %I on storage.objects', 'loadlink_private_'||replace(b,'-','_'));
    execute format($p$create policy %I on storage.objects for all to authenticated
      using (bucket_id=%L and (storage.foldername(name))[1]=auth.uid()::text)
      with check (bucket_id=%L and (storage.foldername(name))[1]=auth.uid()::text)$p$,
      'loadlink_private_'||replace(b,'-','_'), b, b);
  end loop;
end $$;

-- Automatic expiry: returns stale upload sessions for a scheduled cleanup worker.
create or replace function public.loadlink_expired_upload_objects(p_limit integer default 500)
returns table(bucket text, object_path text)
language sql
security definer
set search_path=public
as $$
  select s.bucket, unnest(s.object_paths)
  from public.listing_upload_sessions s
  where s.status='open' and s.expires_at < now()
  limit greatest(1,least(p_limit,2000));
$$;
revoke all on function public.loadlink_expired_upload_objects(integer) from public;
grant execute on function public.loadlink_expired_upload_objects(integer) to service_role;

-- Shared updated_at triggers.
do $$ declare t text;
begin
  foreach t in array array['marketplace_cases','listing_drafts','saved_searches','job_interests','support_tickets','staff_roles'] loop
    execute format('drop trigger if exists %I on public.%I', t||'_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.loadlink_touch_updated_at()', t||'_touch', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- Server-owned commercial rules, expiry, invoicing and quality signals
-- ---------------------------------------------------------------------------

create table if not exists public.marketplace_plan_rules (
  plan_code text primary key,
  display_name text not null,
  listing_image_limit integer not null check (listing_image_limit between 1 and 30),
  daily_message_limit integer,
  analytics_enabled boolean not null default false,
  dealership_tools_enabled boolean not null default false,
  listing_days integer,
  updated_at timestamptz not null default now()
);
insert into public.marketplace_plan_rules(plan_code,display_name,listing_image_limit,daily_message_limit,analytics_enabled,dealership_tools_enabled,listing_days)
values
 ('standard','Standard',5,50,false,false,null),
 ('manual','Manual vehicle listing',5,50,false,false,1),
 ('pro','Pro',15,null,true,false,30),
 ('dealer','Dealership',15,null,true,true,30)
on conflict(plan_code) do update set
 display_name=excluded.display_name,
 listing_image_limit=excluded.listing_image_limit,
 daily_message_limit=excluded.daily_message_limit,
 analytics_enabled=excluded.analytics_enabled,
 dealership_tools_enabled=excluded.dealership_tools_enabled,
 listing_days=excluded.listing_days,
 updated_at=now();

alter table public.job_listings add column if not exists status text not null default 'draft';
alter table public.job_listings add column if not exists package_type text not null default 'standard';
alter table public.job_listings add column if not exists sponsor_label text;
alter table public.job_listings add column if not exists sponsored_until timestamptz;
alter table public.job_listings add column if not exists display_tier integer not null default 1;
alter table public.job_listings add column if not exists duplicate_fingerprint text;
alter table public.job_listings add column if not exists fraud_score integer not null default 0;
alter table public.job_listings add column if not exists document_check_status text not null default 'not_requested';
alter table public.job_listings add column if not exists route_start text;
alter table public.job_listings add column if not exists route_end text;
alter table public.job_listings add column if not exists route_distance_km numeric(10,2);
alter table public.job_listings add column if not exists load_type text;
alter table public.job_listings add column if not exists required_equipment text[] not null default '{}';
alter table public.job_listings add column if not exists rate_amount numeric(14,2);
alter table public.job_listings add column if not exists rate_unit text;
alter table public.job_listings add column if not exists payment_terms text;
alter table public.job_listings add column if not exists recurrence_type text;
alter table public.job_listings add column if not exists recurrence_until date;
alter table public.job_listings add column if not exists work_starts_at timestamptz;
alter table public.job_listings add column if not exists work_ends_at timestamptz;


create index if not exists job_listings_expiry_idx on public.job_listings(expires_at) where expires_at is not null;
create index if not exists job_listings_duplicate_idx on public.job_listings(duplicate_fingerprint) where duplicate_fingerprint is not null;

create or replace function public.loadlink_enforce_listing_rules()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_limit integer := 5;
  v_photo_count integer := 0;
  v_plan text := 'standard';
  v_access public.listing_access_periods%rowtype;
  v_dealer_owner boolean := false;
begin
  if public.loadlink_is_staff(array['moderator','operations','admin','owner']) then
    return new;
  end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  if tg_op='UPDATE' and old.user_id is distinct from auth.uid() then
    raise exception 'Only the listing owner can update this listing';
  end if;
  new.user_id:=auth.uid();
  new.listing_kind:=lower(coalesce(new.listing_kind,'job'));
  if new.listing_kind not in ('job','contract','vehicle') then raise exception 'Invalid listing type'; end if;

  if tg_op='UPDATE' and new.listing_kind is distinct from old.listing_kind then
    raise exception 'A listing type cannot be changed after creation';
  end if;

  if new.listing_kind in ('job','contract') then
    v_plan:='standard';
    new.package_type:='standard';
    new.expires_at:=coalesce(new.expires_at, now()+interval '30 days');
  elsif tg_op='UPDATE' and old.package_type='manual' then
    v_plan:='manual';
    new.package_type:='manual';
    new.listing_access_period_id:=old.listing_access_period_id;
    new.expires_at:=old.expires_at;
  else
    select s.plan_code into v_plan
    from public.user_subscriptions s
    where s.user_id=auth.uid()
      and s.plan_code in ('dealer','pro')
      and s.status='active'
      and coalesce(s.ends_at,s.renews_at,now()+interval '1 day') > now()
    order by case when s.plan_code='dealer' then 0 else 1 end, s.created_at desc
    limit 1;

    if v_plan is null and tg_op='INSERT' then
      select * into v_access
      from public.listing_access_periods a
      where a.user_id=auth.uid() and a.consumed_at is null and a.expires_at>now()
      order by a.created_at asc
      for update skip locked
      limit 1;
      if v_access.id is not null then
        v_plan:='manual';
        new.listing_access_period_id:=v_access.id;
        new.expires_at:=v_access.expires_at;
        update public.listing_access_periods
          set consumed_at=now(), consumed_listing_id=new.id
          where id=v_access.id and consumed_at is null;
        if not found then raise exception 'Manual listing access is no longer available'; end if;
      end if;
    end if;

    if v_plan is null then raise exception 'Paid vehicle listing access is required'; end if;
    new.package_type:=v_plan;
    if v_plan in ('pro','dealer') then
      new.expires_at:=coalesce(new.expires_at,now()+interval '30 days');
    end if;
  end if;

  if new.dealership_id is not null then
    if v_plan<>'dealer' then raise exception 'Dealership inventory requires an active Dealer subscription'; end if;
    select exists(
      select 1 from public.dealership_profiles d
      where d.id=new.dealership_id and d.owner_user_id=auth.uid()
      union all
      select 1 from public.dealership_staff ds
      where ds.dealership_id=new.dealership_id and ds.user_id=auth.uid() and ds.is_active=true
    ) into v_dealer_owner;
    if not coalesce(v_dealer_owner,false) then raise exception 'You cannot add stock to this dealership'; end if;
  end if;

  select listing_image_limit into v_limit from public.marketplace_plan_rules where plan_code=v_plan;
  v_limit:=coalesce(v_limit,5);
  v_photo_count:=coalesce(array_length(new.photos,1),0);
  if v_photo_count > v_limit then raise exception 'This package allows a maximum of % listing images',v_limit; end if;

  -- Promotion and moderation are controlled by verified payments and staff review, never by browser input.
  if tg_op='INSERT' then
    new.sponsored:=false;
    new.sponsor_label:=null;
    new.sponsored_until:=null;
    new.featured_until:=null;
    new.display_tier:=1;
    new.moderation_status:='pending';
    new.lifecycle_status:='pending';
    new.status:='pending';
    new.approved_at:=null;
    new.rejection_reason:=null;
  else
    new.sponsored:=old.sponsored;
    new.sponsor_label:=old.sponsor_label;
    new.sponsored_until:=old.sponsored_until;
    new.featured_until:=old.featured_until;
    new.display_tier:=old.display_tier;
    new.moderation_status:=old.moderation_status;
    new.approved_at:=old.approved_at;
    new.rejection_reason:=old.rejection_reason;
    if new.lifecycle_status not in ('paused','reserved','sold','filled','closed','archived') then new.lifecycle_status:=old.lifecycle_status; end if;
    if new.status not in ('paused','reserved','sold','filled','closed','archived') then new.status:=old.status; end if;
  end if;
  return new;
end $$;
drop trigger if exists loadlink_listing_rules on public.job_listings;
create trigger loadlink_listing_rules before insert or update on public.job_listings
for each row execute function public.loadlink_enforce_listing_rules();

create table if not exists public.marketplace_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default ('INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid references auth.users(id) on delete set null,
  payment_reference text,
  currency text not null default 'ZAR',
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  status text not null default 'issued',
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.marketplace_fraud_signals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  signal_type text not null,
  risk_score integer not null check(risk_score between 0 and 100),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index if not exists marketplace_fraud_queue_idx on public.marketplace_fraud_signals(status,risk_score desc,created_at);

create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  template_key text,
  channel text not null,
  destination_hash text,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table if not exists public.dealership_inventory_imports (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  status text not null default 'queued',
  total_rows integer not null default 0,
  accepted_rows integer not null default 0,
  rejected_rows integer not null default 0,
  error_report_path text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.driver_references (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid not null,
  referee_name text not null,
  referee_company text,
  referee_contact_encrypted text,
  verification_status text not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.driver_profiles add column if not exists licence_expires_at date;
alter table public.driver_profiles add column if not exists prdp_expires_at date;
alter table public.driver_profiles add column if not exists profile_expires_at timestamptz;
alter table public.driver_profiles add column if not exists verification_level text not null default 'unverified';
alter table public.driver_profiles add column if not exists profile_views integer not null default 0;

alter table public.admin_payments add column if not exists payment_type text;
alter table public.admin_payments add column if not exists package_type text;
alter table public.admin_payments add column if not exists paid_at timestamptz;
alter table public.admin_payments add column if not exists refunded_at timestamptz;
alter table public.admin_payments add column if not exists provider_event_id text;
alter table public.admin_payments add column if not exists updated_at timestamptz not null default now();

create or replace function public.loadlink_expire_marketplace_records()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_listings integer:=0; v_drivers integer:=0;
begin
  update public.job_listings set lifecycle_status='expired',status='expired',stock_status='expired',updated_at=now()
  where expires_at < now() and lifecycle_status='active';
  get diagnostics v_listings=row_count;
  update public.driver_profiles set availability_status='unavailable',updated_at=now()
  where profile_expires_at < now() and coalesce(availability_status,'') <> 'unavailable';
  get diagnostics v_drivers=row_count;
  return jsonb_build_object('expired_listings',v_listings,'expired_driver_profiles',v_drivers);
end $$;
revoke all on function public.loadlink_expire_marketplace_records() from public;
grant execute on function public.loadlink_expire_marketplace_records() to service_role;

-- Owner-scoped saved items and comparisons follow the signed-in account across devices.
alter table public.saved_marketplace_items enable row level security;
drop policy if exists loadlink_saved_items_owner on public.saved_marketplace_items;
create policy loadlink_saved_items_owner on public.saved_marketplace_items for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table public.vehicle_comparisons enable row level security;
drop policy if exists loadlink_comparisons_owner on public.vehicle_comparisons;
create policy loadlink_comparisons_owner on public.vehicle_comparisons for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Operational tables are staff-only; users can read their own invoices and delivery status.
alter table public.marketplace_invoices enable row level security;
drop policy if exists loadlink_invoice_owner_read on public.marketplace_invoices;
create policy loadlink_invoice_owner_read on public.marketplace_invoices for select to authenticated using(user_id=auth.uid() or public.loadlink_is_admin());
alter table public.marketplace_fraud_signals enable row level security;
drop policy if exists loadlink_fraud_staff on public.marketplace_fraud_signals;
create policy loadlink_fraud_staff on public.marketplace_fraud_signals for all to authenticated using(public.loadlink_is_admin()) with check(public.loadlink_is_admin());
alter table public.notification_delivery_log enable row level security;
drop policy if exists loadlink_delivery_owner_read on public.notification_delivery_log;
create policy loadlink_delivery_owner_read on public.notification_delivery_log for select to authenticated using(user_id=auth.uid() or public.loadlink_is_admin());



-- Approved driver cards include only public profile information and the optional avatar.
drop function if exists public.loadlink_public_driver_profiles(integer,integer,text,text);
create function public.loadlink_public_driver_profiles(
  p_limit integer default 8,
  p_offset integer default 0,
  p_city text default null,
  p_search text default null
)
returns table (
  id uuid,
  full_name text,
  profile_image_url text,
  headline text,
  city text,
  province text,
  years_experience integer,
  licence_code text,
  vehicle_types text[],
  bio text,
  availability text,
  verification_level text,
  total_count bigint
)
language sql stable security definer set search_path=public,pg_temp as $$
  select
    p.id, p.full_name, p.profile_image_url, p.headline, p.city, p.province,
    p.years_experience, p.licence_code, p.vehicle_types,
    p.bio, p.availability, p.verification_level, count(*) over()::bigint
  from public.driver_profiles p
  where p.status='approved'
    and (p.profile_expires_at is null or p.profile_expires_at > now())
    and (nullif(trim(coalesce(p_city,'')), '') is null or p.city ilike '%' || trim(p_city) || '%')
    and (
      nullif(trim(coalesce(p_search,'')), '') is null
      or concat_ws(' ',p.full_name,p.headline,p.city,p.province,p.licence_code,array_to_string(p.vehicle_types,' '),p.bio)
         ilike '%' || trim(p_search) || '%'
    )
  order by p.approved_at desc nulls last, p.updated_at desc
  limit greatest(1,least(coalesce(p_limit,8),50))
  offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.loadlink_public_driver_profiles(integer,integer,text,text) from public;
grant execute on function public.loadlink_public_driver_profiles(integer,integer,text,text) to anon,authenticated;

-- Refresh the public projection after the final structured fields are added.
drop view if exists public.loadlink_public_listings;
create view public.loadlink_public_listings as
select
  j.id, j.title, j.city, j.province, j.vehicle_group, j.rate,
  j.price_amount, j.price_type, j.description, j.photos, j.sponsored,
  j.poster_photo, j.featured_until, j.view_count,
  j.sponsor_label, j.sponsored_until, j.package_type, j.created_at, j.updated_at, j.listing_kind,
  j.lifecycle_status, j.moderation_status, j.stock_status, j.status, j.expires_at,
  j.vehicle_type, j.vehicle_year, j.brand, j.model, j.body_type,
  j.transmission, j.fuel_type, j.axle_configuration, j.odometer_km,
  j.gvm_kg, j.payload_kg, j.condition, j.service_history, j.previous_owners,
  j.video_url, j.verification_level, j.completion_score, j.document_check_status,
  j.route_start, j.route_end, j.route_distance_km, j.load_type, j.required_equipment,
  j.rate_amount, j.rate_unit, j.payment_terms, j.recurrence_type, j.recurrence_until,
  j.work_starts_at, j.work_ends_at, j.dealership_id, j.posted_by
from public.job_listings j
where coalesce(j.moderation_status,'approved')='approved'
  and coalesce(j.lifecycle_status,j.status,'active')='active'
  and coalesce(j.stock_status,'available') not in ('sold','archived','expired')
  and (j.expires_at is null or j.expires_at > now());
revoke all on public.loadlink_public_listings from public;
grant select on public.loadlink_public_listings to anon, authenticated;

commit;
