-- Emergency switch: disables the NDA gate without deleting acceptance records.
-- Blocked and suspended signed-in accounts remain restricted.
update public.loadlink_nda_settings
set enforcement_enabled = false, updated_at = now()
where singleton = true;
