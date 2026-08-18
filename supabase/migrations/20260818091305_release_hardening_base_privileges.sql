begin;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;

alter table public.loadlink_schema_migrations enable row level security;
alter table public.loadlink_security_rate_windows enable row level security;
revoke all on table public.loadlink_schema_migrations from anon, authenticated;
revoke all on table public.loadlink_security_rate_windows from anon, authenticated;

commit;
