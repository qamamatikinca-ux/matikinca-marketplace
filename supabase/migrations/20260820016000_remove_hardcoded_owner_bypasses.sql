-- LoadLink final-audit owner/admin bypass repair.
-- Owner safety is structural: the last active owner cannot be removed.
-- No production behavior depends on hard-coded owner email addresses.

drop trigger if exists loadlink_protected_owner_admin_row on public.admin_users;
drop trigger if exists protect_loadlink_owner on public.admin_users;

create or replace function public.loadlink_guard_last_active_owner()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_other_active_owners integer:=0;
  v_removing_owner boolean:=false;
begin
  if old.role='owner' and old.is_active=true and coalesce(old.employment_status,'active')='active' then
    v_removing_owner:=tg_op='DELETE' or (
      new.role is distinct from 'owner'
      or new.is_active is distinct from true
      or coalesce(new.employment_status,'active') is distinct from 'active'
      or new.user_id is distinct from old.user_id
    );
    if v_removing_owner then
      select count(*) into v_other_active_owners
      from public.admin_users a
      where a.user_id<>old.user_id
        and a.role='owner'
        and a.is_active=true
        and coalesce(a.employment_status,'active')='active';
      if v_other_active_owners=0 then
        if to_regclass('public.admin_security_events') is not null then
          insert into public.admin_security_events(actor_user_id,event_type,severity,target_type,target_id,metadata)
          values(auth.uid(),'last_owner_mutation_denied','critical','admin_user',old.user_id::text,jsonb_build_object('attempted_operation',tg_op));
        end if;
        raise exception 'At least one active LoadLink owner account must remain.';
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create trigger loadlink_guard_last_active_owner_trigger
before update or delete on public.admin_users
for each row execute function public.loadlink_guard_last_active_owner();

-- No account receives moderation immunity because of its email address.
drop trigger if exists loadlink_protected_owner_moderation on public.user_moderation_profiles;
drop trigger if exists protect_loadlink_owner_moderation on public.user_moderation_profiles;

create or replace function public.loadlink_dealer_update_action(p_action text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  c jsonb;
  d uuid;
  uid uuid:=auth.uid();
  row_id uuid;
  typ text;
  desired text;
  scheduled timestamptz;
  expires timestamptz;
  trusted boolean:=false;
  u public.dealership_updates%rowtype;
begin
  c:=public.loadlink_get_my_dealer_context();
  d:=(c->>'dealership_id')::uuid;
  if not (c->'permissions' ? 'marketing.write') then raise exception 'You do not have dealership update permission'; end if;

  if p_action='create' then
    typ:=coalesce(nullif(p_payload->>'update_type',''),'branch_announcement');
    if typ not in ('new_stock','new_arrival','price_reduction','weekend_special','finance_offer','clearance','branch_announcement','trading_hours') then raise exception 'Choose a valid dealership update type'; end if;
    if char_length(btrim(coalesce(p_payload->>'title','')))<2 then raise exception 'Enter an update title'; end if;
    if nullif(p_payload->>'listing_id','') is not null and not exists(
      select 1 from public.job_listings where id=(p_payload->>'listing_id')::uuid and dealership_id=d
    ) then raise exception 'That vehicle is not part of this dealership'; end if;

    scheduled:=nullif(p_payload->>'scheduled_at','')::timestamptz;
    expires:=nullif(p_payload->>'expires_at','')::timestamptz;
    desired:=coalesce(nullif(p_payload->>'publication_status',''),'draft');
    if desired not in ('draft','scheduled','pending','published') then desired:='draft'; end if;

    trusted:=(c->>'verification_status')='approved'
      and (c->>'account_status')='active'
      and (c->>'subscription_status') in ('active','past_due','grace_period')
      and public.loadlink_dealer_has_permission(d,'marketing.publish');

    if desired='published' and not trusted then desired:='pending'; end if;
    if desired='scheduled' and scheduled is null then raise exception 'Choose when the update should publish'; end if;

    insert into public.dealership_updates(
      dealership_id,author_user_id,update_type,title,body,image_url,listing_id,status,
      publication_status,scheduled_at,published_at,expires_at,updated_at
    ) values(
      d,uid,typ,btrim(p_payload->>'title'),btrim(coalesce(p_payload->>'body','')),
      nullif(p_payload->>'image_url',''),nullif(p_payload->>'listing_id','')::uuid,
      case when desired='published' and trusted then 'approved' else 'pending' end,
      desired,scheduled,case when desired='published' and trusted then now() else null end,expires,now()
    ) returning * into u;

    row_id:=u.id;
    perform public.loadlink_log_dealer_activity(
      d,
      case when desired='published' then 'published a dealership update' when desired='scheduled' then 'scheduled a dealership update' else 'created a dealership update' end,
      'dealership_update',u.id::text,u.title,null,null,to_jsonb(u)
    );
  elsif p_action in ('publish','remove') then
    row_id:=(p_payload->>'update_id')::uuid;
    select * into u from public.dealership_updates where id=row_id and dealership_id=d for update;
    if not found then raise exception 'Dealership update not found'; end if;

    if p_action='remove' then
      update public.dealership_updates set status='removed',publication_status='removed',updated_at=now() where id=row_id;
      perform public.loadlink_log_dealer_activity(d,'removed a dealership update','dealership_update',row_id::text,u.title,null,to_jsonb(u),null);
    else
      if not public.loadlink_dealer_has_permission(d,'marketing.publish') then raise exception 'You do not have publishing permission'; end if;
      if (c->>'verification_status')<>'approved' or (c->>'account_status')<>'active' or (c->>'subscription_status') not in ('active','past_due','grace_period') then
        raise exception 'Dealer standing must be active and verified before publishing';
      end if;
      update public.dealership_updates
      set status='approved',publication_status='published',published_at=coalesce(published_at,now()),moderation_reason=null,updated_at=now()
      where id=row_id;
      perform public.loadlink_log_dealer_activity(d,'published a dealership update','dealership_update',row_id::text,u.title,null,to_jsonb(u),null);
    end if;
  else
    raise exception 'Unsupported dealership update action';
  end if;

  return jsonb_build_object('ok',true,'update_id',row_id);
end;
$$;
