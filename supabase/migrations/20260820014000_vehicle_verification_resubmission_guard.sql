create or replace function public.loadlink_guard_vehicle_verification_owner()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) then return new; end if;
  if auth.uid() is null then
    if session_user in ('postgres','supabase_admin') then return new; end if;
    raise exception 'Authentication required';
  end if;
  if public.loadlink_account_is_restricted(auth.uid()) then raise exception 'ACCOUNT_ACCESS_RESTRICTED'; end if;

  if tg_op='INSERT' then
    if new.user_id is distinct from auth.uid() then new.user_id:=auth.uid(); end if;
    if not exists(select 1 from public.job_listings j where j.id=new.listing_id and j.user_id=auth.uid()) then raise exception 'Vehicle listing not found'; end if;
    new.status:='pending'; new.reviewer_notes:=null; new.updated_at:=now();
    return new;
  end if;

  if old.user_id is distinct from auth.uid() then raise exception 'Only the listing owner can update this verification'; end if;
  if new.user_id is distinct from old.user_id or new.listing_id is distinct from old.listing_id then raise exception 'Vehicle verification ownership cannot be changed'; end if;

  new.status:='pending'; new.reviewer_notes:=null; new.updated_at:=now();
  perform set_config('loadlink.resubmission','on',true);
  update public.job_listings
  set moderation_status='pending',moderation_notes=null,moderated_at=null,moderated_by=null,
      approved_at=null,rejection_reason=null,lifecycle_status='draft',status='active',updated_at=now()
  where id=old.listing_id and user_id=auth.uid();
  perform set_config('loadlink.resubmission','off',true);
  return new;
end;
$$;

drop trigger if exists loadlink_guard_vehicle_verification_owner_trigger on public.vehicle_verifications;
create trigger loadlink_guard_vehicle_verification_owner_trigger
before insert or update on public.vehicle_verifications
for each row execute function public.loadlink_guard_vehicle_verification_owner();

drop policy if exists "vehicle verification owner update" on public.vehicle_verifications;
create policy "vehicle verification owner update"
on public.vehicle_verifications
for update to authenticated
using (user_id=auth.uid() and not public.loadlink_marketplace_is_restricted(auth.uid()))
with check (user_id=auth.uid() and not public.loadlink_marketplace_is_restricted(auth.uid()));
