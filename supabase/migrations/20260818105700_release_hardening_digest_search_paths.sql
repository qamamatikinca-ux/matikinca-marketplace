begin;

alter function public.loadlink_accept_current_nda(text,text,text,jsonb)
  set search_path = public, extensions, auth, pg_temp;
alter function public.loadlink_accept_dealer_staff_invitation_token(text)
  set search_path = public, extensions, pg_temp;
alter function public.loadlink_access_guard_state()
  set search_path = public, extensions, auth, pg_temp;
alter function public.loadlink_access_state()
  set search_path = public, extensions, auth, pg_temp;
alter function public.loadlink_admin_set_user_access(uuid,text,text,timestamptz)
  set search_path = public, extensions, auth, pg_temp;
alter function public.loadlink_dealer_create_invitation(text,text)
  set search_path = public, extensions, pg_temp;
alter function public.loadlink_dealer_team_action(text,jsonb)
  set search_path = public, extensions, pg_temp;
alter function public.record_job_view(uuid,text,text,text)
  set search_path = public, extensions, pg_temp;
alter function public.start_listing_conversation(uuid,uuid,text)
  set search_path = public, extensions, pg_temp;

commit;
