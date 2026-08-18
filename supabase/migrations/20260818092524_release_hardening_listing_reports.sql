begin;

alter table public.user_reports enable row level security;

revoke all privileges on table public.user_reports from anon, authenticated;
grant select, insert, update on table public.user_reports to authenticated;

drop policy if exists user_reports_reporter_insert on public.user_reports;
create policy user_reports_reporter_insert
on public.user_reports
for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and listing_id is not null
  and category in ('suspected_scam','incorrect_information','no_longer_available','duplicate','misleading_price','inappropriate','other')
  and status = 'open'
  and assigned_to is null
  and resolution_notes is null
  and resolved_at is null
);

drop policy if exists user_reports_reporter_read on public.user_reports;
create policy user_reports_reporter_read
on public.user_reports
for select
to authenticated
using (
  reporter_user_id = (select auth.uid())
  or public.loadlink_is_staff(null::text[])
);

drop policy if exists user_reports_staff_update on public.user_reports;
create policy user_reports_staff_update
on public.user_reports
for update
to authenticated
using (public.loadlink_is_staff(null::text[]))
with check (public.loadlink_is_staff(null::text[]));

commit;
