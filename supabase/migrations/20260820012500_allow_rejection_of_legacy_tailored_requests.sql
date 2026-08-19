create or replace function public.loadlink_validate_dealer_custom_request()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare
  f jsonb:=coalesce(new.requested_features,'{}'::jsonb);
  dealer_intent boolean:=false;
  photos int:=0;
  listings int:=0;
  seats int:=1;
  effective_amount int:=0;
begin
  -- Reviewers must always be able to reject an old or malformed request.
  if coalesce(new.status,'pending_review')='rejected' then return new; end if;
  begin photos:=coalesce(nullif(f->>'photos','')::int,0); exception when others then photos:=0; end;
  begin listings:=coalesce(nullif(f->>'listings','')::int,0); exception when others then listings:=0; end;
  begin seats:=coalesce(nullif(f->>'teamSeats','')::int,1); exception when others then seats:=1; end;
  dealer_intent:=coalesce((f->>'showroom')::boolean,false) or seats>1 or listings>=10 or new.recommended_plan='dealer';
  effective_amount:=coalesce(new.final_amount_cents,new.estimated_amount_cents,0);
  if dealer_intent then
    if photos<10 then raise exception 'Dealer-tailored packages require at least 10 photos per vehicle'; end if;
    if effective_amount<250000 then raise exception 'Dealer-tailored packages cannot be approved below R2 500/month'; end if;
  end if;
  return new;
end;
$$;
