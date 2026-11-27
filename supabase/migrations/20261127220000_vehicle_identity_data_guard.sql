-- Validate modern VINs and core truck/bakkie measurements server-side.
-- Historical records are not rewritten; checks run on new/changed identities.
create or replace function public.loadlink_validate_truck_identity_format()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare
 v_vin text := upper(trim(coalesce(new.vin,'')));
 v_reg text := upper(trim(coalesce(new.registration_number,'')));
 v_engine text := upper(trim(coalesce(new.engine_number,'')));
begin
 if new.vehicle_year >= 1981 then
  if length(v_vin) <> 17 or v_vin !~ '^[A-HJ-NPR-Z0-9]{17}$' or v_vin ~ '^(.)\1{16}$' then
   raise exception 'INVALID_VIN_FORMAT: Modern vehicle VIN must be 17 characters, excluding I, O and Q.'
     using errcode='22023';
  end if;
 elsif new.vehicle_year < 1981 and (length(v_vin) < 5 or length(v_vin) > 17 or v_vin !~ '^[A-Z0-9]+$') then
  raise exception 'INVALID_HISTORIC_CHASSIS: Expected 5-17 letters/digits from supporting documents.'
    using errcode='22023';
 end if;
 if v_reg !~ '^[A-Z0-9 -]{2,15}$' or length(regexp_replace(v_reg,'[^A-Z0-9]','','g')) < 2 then
  raise exception 'INVALID_REGISTRATION_FORMAT: Check the registration number against the vehicle documents.'
    using errcode='22023';
 end if;
 if v_engine <> '' and (length(v_engine)>20 or v_engine !~ '^[A-Z0-9/-]+$') then
  raise exception 'INVALID_ENGINE_NUMBER: Engine number must be 20 or fewer alphanumeric characters.'
    using errcode='22023';
 end if;
 if new.odometer_km < 0 or new.odometer_km > 99999999 then
  raise exception 'INVALID_ODOMETER_READING' using errcode='22023';
 end if;
 if new.gvm_kg is not null and (new.gvm_kg<=0 or new.gvm_kg>150000) then
  raise exception 'INVALID_GVM_KG' using errcode='22023';
 end if;
 if new.payload_kg is not null and (new.payload_kg<=0 or new.payload_kg>150000
  or (new.gvm_kg is not null and new.payload_kg>new.gvm_kg)) then
  raise exception 'INVALID_PAYLOAD_KG' using errcode='22023';
 end if;
 new.vin:=v_vin;
 new.registration_number:=v_reg;
 new.engine_number:=v_engine;
 return new;
end
$$;
drop trigger if exists loadlink_truck_identity_format_guard on public.truck_listing_details;
create trigger loadlink_truck_identity_format_guard
 before insert or update of vin,vehicle_year,registration_number,engine_number,odometer_km,gvm_kg,payload_kg
 on public.truck_listing_details
 for each row execute function public.loadlink_validate_truck_identity_format();
