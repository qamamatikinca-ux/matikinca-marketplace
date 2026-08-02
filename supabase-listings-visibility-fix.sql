-- Run once in Supabase SQL Editor only if public posts are not visible.
alter table public.job_listings enable row level security;

drop policy if exists "loadlink_jobs_read_all" on public.job_listings;
create policy "loadlink_jobs_read_all"
on public.job_listings
for select
using (true);

grant select on public.job_listings to anon, authenticated;
