-- Protect alternate vehicle identity claim writes with matching VIN rules.
CREATE OR REPLACE FUNCTION public.loadlink_vehicle_claim_identity_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_owned boolean:=false;v_other boolean:=false;v_year integer;
BEGIN
 IF auth.uid() IS NULL OR new.user_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'You must own this vehicle listing';
 END IF;
 SELECT j.vehicle_year INTO v_year FROM public.job_listings j
    WHERE j.id=new.listing_id AND j.user_id=new.user_id AND j.listing_kind='vehicle' LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'A valid owned vehicle listing is required'; END IF;
 new.vin_normalized:=upper(regexp_replace(coalesce(new.vin_normalized,''),'[^a-zA-Z0-9]','','g'));
 new.plate_normalized:=upper(regexp_replace(coalesce(new.plate_normalized,''),'[^a-zA-Z0-9]','','g'));
 IF (v_year IS NULL OR v_year >= 1981) AND (
       length(new.vin_normalized) <> 17
       OR new.vin_normalized !~ '^[A-HJ-NPR-Z0-9]{17}
 SELECT coalesce(bool_or(j.user_id=new.user_id),false),coalesce(bool_or(j.user_id<>new.user_id),false)
 INTO v_owned,v_other
 FROM (
   SELECT d.listing_id,d.vin,d.registration_number
   FROM public.truck_listing_details d
   UNION ALL
   SELECT c.listing_id,c.vin_normalized,c.plate_normalized
   FROM public.vehicle_identity_claims c
 ) x
 JOIN public.job_listings j ON j.id=x.listing_id
 WHERE x.listing_id<>new.listing_id AND j.listing_kind='vehicle'
   AND j.status='active'
   AND coalesce(j.stock_status,'available') NOT IN ('removed','sold','unavailable')
   AND (j.expires_at IS NULL OR j.expires_at>now())
   AND (upper(regexp_replace(x.vin,'[^a-zA-Z0-9]','','g'))=new.vin_normalized
       OR upper(regexp_replace(x.registration_number,'[^a-zA-Z0-9]','','g'))=new.plate_normalized);
 IF v_owned THEN RAISE EXCEPTION 'VEHICLE_ALREADY_LISTED' USING errcode='P0001'; END IF;
 IF v_other THEN
   INSERT INTO public.vehicle_listing_review_flags(listing_id,user_id,flag)
   VALUES(new.listing_id,new.user_id,'identity_requires_review')
   ON CONFLICT(listing_id) DO UPDATE SET flag='identity_requires_review';
   UPDATE public.job_listings SET fraud_score=greatest(fraud_score,40) WHERE id=new.listing_id;
 END IF;
 RETURN new;
END $function$

       OR new.vin_normalized ~ '^(.)\1{16}
 SELECT coalesce(bool_or(j.user_id=new.user_id),false),coalesce(bool_or(j.user_id<>new.user_id),false)
 INTO v_owned,v_other
 FROM (
   SELECT d.listing_id,d.vin,d.registration_number
   FROM public.truck_listing_details d
   UNION ALL
   SELECT c.listing_id,c.vin_normalized,c.plate_normalized
   FROM public.vehicle_identity_claims c
 ) x
 JOIN public.job_listings j ON j.id=x.listing_id
 WHERE x.listing_id<>new.listing_id AND j.listing_kind='vehicle'
   AND j.status='active'
   AND coalesce(j.stock_status,'available') NOT IN ('removed','sold','unavailable')
   AND (j.expires_at IS NULL OR j.expires_at>now())
   AND (upper(regexp_replace(x.vin,'[^a-zA-Z0-9]','','g'))=new.vin_normalized
       OR upper(regexp_replace(x.registration_number,'[^a-zA-Z0-9]','','g'))=new.plate_normalized);
 IF v_owned THEN RAISE EXCEPTION 'VEHICLE_ALREADY_LISTED' USING errcode='P0001'; END IF;
 IF v_other THEN
   INSERT INTO public.vehicle_listing_review_flags(listing_id,user_id,flag)
   VALUES(new.listing_id,new.user_id,'identity_requires_review')
   ON CONFLICT(listing_id) DO UPDATE SET flag='identity_requires_review';
   UPDATE public.job_listings SET fraud_score=greatest(fraud_score,40) WHERE id=new.listing_id;
 END IF;
 RETURN new;
END $function$

     ) THEN
   RAISE EXCEPTION 'INVALID_VIN_FORMAT: Modern VIN must have 17 letters/digits excluding I, O and Q'
    USING errcode='22023';
 END IF;
 IF v_year < 1981 AND (
       length(new.vin_normalized)<5 OR length(new.vin_normalized)>17
       OR new.vin_normalized !~ '^[A-Z0-9]+
 SELECT coalesce(bool_or(j.user_id=new.user_id),false),coalesce(bool_or(j.user_id<>new.user_id),false)
 INTO v_owned,v_other
 FROM (
   SELECT d.listing_id,d.vin,d.registration_number
   FROM public.truck_listing_details d
   UNION ALL
   SELECT c.listing_id,c.vin_normalized,c.plate_normalized
   FROM public.vehicle_identity_claims c
 ) x
 JOIN public.job_listings j ON j.id=x.listing_id
 WHERE x.listing_id<>new.listing_id AND j.listing_kind='vehicle'
   AND j.status='active'
   AND coalesce(j.stock_status,'available') NOT IN ('removed','sold','unavailable')
   AND (j.expires_at IS NULL OR j.expires_at>now())
   AND (upper(regexp_replace(x.vin,'[^a-zA-Z0-9]','','g'))=new.vin_normalized
       OR upper(regexp_replace(x.registration_number,'[^a-zA-Z0-9]','','g'))=new.plate_normalized);
 IF v_owned THEN RAISE EXCEPTION 'VEHICLE_ALREADY_LISTED' USING errcode='P0001'; END IF;
 IF v_other THEN
   INSERT INTO public.vehicle_listing_review_flags(listing_id,user_id,flag)
   VALUES(new.listing_id,new.user_id,'identity_requires_review')
   ON CONFLICT(listing_id) DO UPDATE SET flag='identity_requires_review';
   UPDATE public.job_listings SET fraud_score=greatest(fraud_score,40) WHERE id=new.listing_id;
 END IF;
 RETURN new;
END $function$

     ) THEN
   RAISE EXCEPTION 'INVALID_HISTORIC_CHASSIS: Use the 5-17 character historic chassis ID'
    USING errcode='22023';
 END IF;
 IF length(new.plate_normalized)<2 OR length(new.plate_normalized)>15 THEN
   RAISE EXCEPTION 'INVALID_REGISTRATION_FORMAT: Check the registration number on the documents'
    USING errcode='22023';
 END IF;
 SELECT coalesce(bool_or(j.user_id=new.user_id),false),coalesce(bool_or(j.user_id<>new.user_id),false)
 INTO v_owned,v_other
 FROM (
   SELECT d.listing_id,d.vin,d.registration_number
   FROM public.truck_listing_details d
   UNION ALL
   SELECT c.listing_id,c.vin_normalized,c.plate_normalized
   FROM public.vehicle_identity_claims c
 ) x
 JOIN public.job_listings j ON j.id=x.listing_id
 WHERE x.listing_id<>new.listing_id AND j.listing_kind='vehicle'
   AND j.status='active'
   AND coalesce(j.stock_status,'available') NOT IN ('removed','sold','unavailable')
   AND (j.expires_at IS NULL OR j.expires_at>now())
   AND (upper(regexp_replace(x.vin,'[^a-zA-Z0-9]','','g'))=new.vin_normalized
       OR upper(regexp_replace(x.registration_number,'[^a-zA-Z0-9]','','g'))=new.plate_normalized);
 IF v_owned THEN RAISE EXCEPTION 'VEHICLE_ALREADY_LISTED' USING errcode='P0001'; END IF;
 IF v_other THEN
   INSERT INTO public.vehicle_listing_review_flags(listing_id,user_id,flag)
   VALUES(new.listing_id,new.user_id,'identity_requires_review')
   ON CONFLICT(listing_id) DO UPDATE SET flag='identity_requires_review';
   UPDATE public.job_listings SET fraud_score=greatest(fraud_score,40) WHERE id=new.listing_id;
 END IF;
 RETURN new;
END $function$;
