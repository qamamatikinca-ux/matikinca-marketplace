drop trigger if exists protect_loadlink_owner_auth_ban on auth.users;

drop function if exists public.loadlink_protect_owner_admin_row();
drop function if exists public.loadlink_protect_owner_moderation();
drop function if exists public.prevent_owner_admin_mutation();
drop function if exists public.prevent_protected_owner_moderation();
drop function if exists public.prevent_protected_owner_auth_ban();

drop table if exists public.loadlink_protected_owners;
