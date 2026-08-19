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
  v_is_dealer_inventory boolean:=new.dealership_id is not null;
begin
  if not v_is_dealer_inventory then return new; end if;

  if auth.uid() is null then
    if session_user in ('postgres','supabase_admin') then return new; end if;
    raise exception 'Authentication required';
  end if;

  if to_regprocedure('public.loadlink_phase2_is_admin()') is not null then
    begin execute 'select public.loadlink_phase2_is_admin()' into v_admin; exception when others then v_admin:=false; end;
  end if;
  if not v_admin and to_regprocedure('public.loadlink_is_admin()') is not null then
    begin execute 'select public.loadlink_is_admin()' into v_admin; exception when others then v_admin:=false; end;
  end if;

  select owner_user_id into v_owner from public.dealership_profiles where id=new.dealership_id;
  if v_owner is null then raise exception 'Dealership not found'; end if;

  if not v_admin then
    if not public.loadlink_dealer_has_permission(new.dealership_id,'inventory.write') then raise exception 'You do not have inventory editing permission for this dealership'; end if;
    v_sub:=public.loadlink_dealer_subscription_state(v_owner);
    if coalesce(v_sub->>'status','expired') not in ('active','past_due','grace_period') then raise exception 'An active Dealer package or billing grace period is required'; end if;

    if tg_op='INSERT' then
      new.package_type:='dealer';new.listing_kind:='vehicle';new.sponsored:=false;new.moderation_status:='pending';new.lifecycle_status:='draft';new.stock_status:='available';
    else
      if new.dealership_id is distinct from old.dealership_id then raise exception 'A Dealer listing cannot be moved to another dealership'; end if;
      new.moderation_status:=old.moderation_status;
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
