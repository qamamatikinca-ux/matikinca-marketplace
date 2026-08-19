-- LoadLink final-audit role-scoped authorization.
-- Owner/admin retain full authority; moderator, operations, support and finance
-- only receive the permissions explicitly requested by each staff-checked RPC.

create or replace function public.loadlink_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select auth.uid() is not null and exists(
    select 1 from public.admin_users a
    where a.user_id=auth.uid()
      and a.is_active=true
      and coalesce(a.employment_status,'active')='active'
      and lower(a.role) in ('owner','admin')
  );
$$;

create or replace function public.is_loadlink_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select public.loadlink_is_admin();
$$;

create or replace function public.loadlink_nda_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select public.loadlink_is_admin();
$$;

create or replace function public.loadlink_phase2_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select public.loadlink_is_admin();
$$;

create or replace function public.loadlink_phase2_admin_role()
returns text
language sql
stable
security definer
set search_path to 'public','auth','pg_temp'
as $$
  select coalesce((
    select lower(a.role)
    from public.admin_users a
    where a.user_id=auth.uid()
      and a.is_active=true
      and coalesce(a.employment_status,'active')='active'
    limit 1
  ),'');
$$;

create or replace function public.loadlink_is_staff(required_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select public.loadlink_is_trusted_server()
    or public.loadlink_is_admin()
    or exists (
      select 1
      from public.admin_users a
      where a.user_id=auth.uid()
        and a.is_active=true
        and coalesce(a.employment_status,'active')='active'
        and (required_roles is null or lower(a.role)=any(required_roles))
    )
    or exists (
      select 1
      from public.staff_roles sr
      left join public.admin_users au on au.user_id=sr.user_id
      where sr.user_id=auth.uid()
        and sr.active=true
        and (required_roles is null or lower(sr.role)=any(required_roles))
        and (au.user_id is null or (au.is_active=true and coalesce(au.employment_status,'active')='active'))
    );
$$;

create or replace function public.loadlink_dealer_admin_allowed()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']);
$$;

create or replace function public.loadlink_access_guard_state()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','extensions','auth','pg_temp'
as $$
declare
  v_user_id uuid:=auth.uid();
  v_email text:=lower(coalesce(auth.jwt()->>'email',''));
  v_status text:='active';
  v_reason text;
  v_suspended_until timestamptz;
  v_is_admin boolean:=false;
  v_identity_blocked boolean:=false;
begin
  if v_user_id is null then
    return jsonb_build_object('authenticated',false,'allowed',true,'isAdmin',false,'status','guest','reason',null,'suspendedUntil',null);
  end if;

  v_is_admin:=public.loadlink_is_admin();

  select coalesce(status,'active'),reason,suspended_until
  into v_status,v_reason,v_suspended_until
  from public.user_moderation_profiles
  where user_id=v_user_id;
  v_status:=coalesce(v_status,'active');

  if v_status='suspended' and v_suspended_until is not null and v_suspended_until<=now() then
    v_status:='active'; v_reason:=null; v_suspended_until:=null;
  end if;

  if v_email<>'' then
    select exists(
      select 1 from public.loadlink_blocked_identity_hashes
      where identity_type='email'
        and identity_sha256=encode(digest(v_email,'sha256'),'hex')
    ) into v_identity_blocked;
  end if;

  if v_identity_blocked then
    v_status:='blocked';
    v_reason:=coalesce(v_reason,'This identity is linked to a blocked LoadLink account.');
  end if;

  return jsonb_build_object(
    'authenticated',true,
    'allowed',v_is_admin or v_status not in ('blocked','suspended'),
    'isAdmin',v_is_admin,
    'status',v_status,
    'reason',v_reason,
    'suspendedUntil',v_suspended_until
  );
end;
$$;
