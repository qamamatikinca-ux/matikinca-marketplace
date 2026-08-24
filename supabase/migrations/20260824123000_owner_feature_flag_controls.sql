-- Owner/Admin-only mutation for existing runtime feature flags.
-- This cannot create arbitrary flags: only registered keys may be changed.

create or replace function public.loadlink_owner_set_feature_flag(flag_key text, next_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  staff_role text := public.loadlink_phase2_admin_role();
  clean_key text := trim(coalesce(flag_key, ''));
  previous_enabled boolean;
  changed boolean := false;
begin
  if staff_role not in ('owner', 'admin') then
    raise exception 'Feature control access denied' using errcode = '42501';
  end if;

  if clean_key = '' then
    raise exception 'Feature flag key is required' using errcode = '22023';
  end if;

  select enabled
  into previous_enabled
  from public.loadlink_feature_flags
  where key = clean_key
  for update;

  if not found then
    raise exception 'Unknown feature flag' using errcode = '22023';
  end if;

  if previous_enabled is distinct from next_enabled then
    update public.loadlink_feature_flags
    set enabled = next_enabled,
        updated_at = now()
    where key = clean_key;
    changed := true;

    insert into public.admin_audit_trail(actor_user_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(),
      'feature_flag_updated',
      'feature_flag',
      clean_key,
      jsonb_build_object('enabled', previous_enabled),
      jsonb_build_object('enabled', next_enabled)
    );
  end if;

  return jsonb_build_object(
    'key', clean_key,
    'enabled', next_enabled,
    'changed', changed
  );
end;
$$;

revoke execute on function public.loadlink_owner_set_feature_flag(text, boolean) from public, anon;
grant execute on function public.loadlink_owner_set_feature_flag(text, boolean) to authenticated;
