-- LoadLink Nov 2026: vehicle document schema, owner identity evidence and preliminary review.
-- Applied in production as scoped migrations on 2026-11-25; this file retains the intended schema for new environments.
ALTER TABLE public.vehicle_verifications
 ADD COLUMN IF NOT EXISTS roadworthy_document_path text,
 ADD COLUMN IF NOT EXISTS operating_licence_document_path text,
 ADD COLUMN IF NOT EXISTS modification_document_path text,
 ADD COLUMN IF NOT EXISTS face_portrait_path text,
 ADD COLUMN IF NOT EXISTS face_video_path text,
 ADD COLUMN IF NOT EXISTS face_review_mode text NOT NULL DEFAULT 'manual',
 ADD COLUMN IF NOT EXISTS face_consent_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_verifications_listing_id_unique ON public.vehicle_verifications(listing_id);
CREATE TABLE IF NOT EXISTS public.vehicle_prelisting_reviews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_token text NOT NULL CHECK(length(request_token) BETWEEN 6 AND 150),
 title text NOT NULL CHECK(length(trim(title))>=2),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 photo_urls text[] NOT NULL DEFAULT '{}'::text[],
 id_document_path text NOT NULL,registration_document_path text NOT NULL,ownership_document_path text NOT NULL,
 face_portrait_path text,face_video_path text,face_mode text NOT NULL CHECK(face_mode IN ('camera','manual')),
 face_consent_at timestamptz,
 seller_type text NOT NULL DEFAULT 'private' CHECK(seller_type IN ('private','dealership')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready_for_plan','needs_changes')),
 reviewer_notes text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_token)
);
ALTER TABLE public.vehicle_prelisting_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vehicle_review_owner_read ON public.vehicle_prelisting_reviews;
DROP POLICY IF EXISTS vehicle_review_owner_submit ON public.vehicle_prelisting_reviews;
CREATE POLICY vehicle_review_owner_read ON public.vehicle_prelisting_reviews FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY vehicle_review_owner_submit ON public.vehicle_prelisting_reviews FOR INSERT TO authenticated WITH CHECK(
 user_id=auth.uid() AND status='pending' AND reviewer_notes IS NULL AND
 (seller_type='dealership' OR (face_consent_at IS NOT NULL AND face_consent_at<=now() AND
  (face_mode='manual' OR (face_portrait_path IS NOT NULL AND face_video_path IS NOT NULL))))
);
REVOKE ALL ON public.vehicle_prelisting_reviews FROM anon;
GRANT SELECT,INSERT ON public.vehicle_prelisting_reviews TO authenticated;
CREATE OR REPLACE FUNCTION public.loadlink_guard_vehicle_prelisting_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
BEGIN
 IF auth.uid() IS NULL OR new.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Authenticated seller required'; END IF;
 IF public.loadlink_account_is_restricted(auth.uid()) THEN RAISE EXCEPTION 'Account restricted'; END IF;
 IF length(new.payload::text)>18000 THEN RAISE EXCEPTION 'Vehicle details too large'; END IF;
 IF cardinality(new.photo_urls)<2 OR cardinality(new.photo_urls)>30 THEN RAISE EXCEPTION 'At least two vehicle photos required'; END IF;
 IF (SELECT count(*) FROM public.vehicle_prelisting_reviews r WHERE r.user_id=new.user_id AND r.created_at>now()-interval '1 day')>=3
 THEN RAISE EXCEPTION 'Daily vehicle pre-review limit reached'; END IF;
 IF new.seller_type='private' AND (new.face_consent_at IS NULL OR (new.face_mode='camera' AND
   (new.face_portrait_path IS NULL OR new.face_video_path IS NULL))) THEN RAISE EXCEPTION 'Identity evidence incomplete'; END IF;
 RETURN new;
END; $$;
DROP TRIGGER IF EXISTS loadlink_guard_vehicle_prelisting_request_trigger ON public.vehicle_prelisting_reviews;
CREATE TRIGGER loadlink_guard_vehicle_prelisting_request_trigger BEFORE INSERT ON public.vehicle_prelisting_reviews FOR EACH ROW EXECUTE FUNCTION public.loadlink_guard_vehicle_prelisting_request();
CREATE OR REPLACE FUNCTION public.loadlink_require_private_seller_face_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE v public.vehicle_verifications%rowtype;
BEGIN
 IF new.listing_kind='vehicle' AND new.dealership_id IS NULL AND new.moderation_status='approved'
  AND old.moderation_status IS DISTINCT FROM 'approved' THEN
  SELECT * INTO v FROM public.vehicle_verifications WHERE listing_id=new.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle verification missing'; END IF;
  IF coalesce(v.dealership_application,false) THEN RETURN new; END IF;
  IF v.face_consent_at IS NULL OR v.id_document_path IS NULL OR v.registration_document_path IS NULL OR v.ownership_document_path IS NULL
   OR (v.face_review_mode='camera' AND (v.face_portrait_path IS NULL OR v.face_video_path IS NULL))
   OR v.face_review_mode NOT IN ('camera','manual') THEN RAISE EXCEPTION 'Private seller identity review incomplete'; END IF;
 END IF;
 RETURN new;
END; $$;
DROP TRIGGER IF EXISTS loadlink_require_private_seller_face_evidence_trigger ON public.job_listings;
CREATE TRIGGER loadlink_require_private_seller_face_evidence_trigger BEFORE UPDATE OF moderation_status ON public.job_listings
 FOR EACH ROW EXECUTE FUNCTION public.loadlink_require_private_seller_face_evidence();
CREATE OR REPLACE FUNCTION public.loadlink_admin_vehicle_prelisting_queue(p_limit integer DEFAULT 40)
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
 SELECT jsonb_build_object('id',r.id,'title',r.title,'user_id',r.user_id,
   'owner_email',(SELECT p.email FROM public.profiles p WHERE p.id=r.user_id),
   'status',r.status,'created_at',r.created_at,'details',r.payload,'photos',r.photo_urls,
   'id_path',r.id_document_path,'registration_path',r.registration_document_path,
   'ownership_path',r.ownership_document_path,'face_mode',r.face_mode,
   'portrait_path',r.face_portrait_path,'video_path',r.face_video_path,
   'face_consent_at',r.face_consent_at,'notes',r.reviewer_notes)
 FROM public.vehicle_prelisting_reviews r
 WHERE public.loadlink_is_staff(array['moderator','operations','verification','admin','owner'])
 ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT greatest(1,least(p_limit,100));
$$;
REVOKE ALL ON FUNCTION public.loadlink_admin_vehicle_prelisting_queue(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.loadlink_admin_vehicle_prelisting_queue(integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.loadlink_review_vehicle_prelisting(p_id uuid,p_decision text,p_notes text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
BEGIN
 IF NOT public.loadlink_is_staff(array['moderator','operations','verification','admin','owner']) THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF p_decision NOT IN ('ready_for_plan','needs_changes') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 IF p_decision='needs_changes' AND length(trim(coalesce(p_notes,'')))<5 THEN RAISE EXCEPTION 'Give a reason for corrections'; END IF;
 UPDATE public.vehicle_prelisting_reviews SET status=p_decision,reviewer_notes=left(nullif(trim(coalesce(p_notes,'')),''),600),updated_at=now() WHERE id=p_id;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.loadlink_review_vehicle_prelisting(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.loadlink_review_vehicle_prelisting(uuid,text,text) TO authenticated;
COMMENT ON TABLE public.vehicle_prelisting_reviews IS 'Protected pending-plan vehicle identity requests, never public sale listings or paid listing credits.';
