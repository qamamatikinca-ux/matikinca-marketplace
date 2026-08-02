-- Re-enable the current LoadLink NDA gate.
update public.loadlink_nda_settings
set enforcement_enabled = true, updated_at = now()
where singleton = true;
