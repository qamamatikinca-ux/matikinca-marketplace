drop policy if exists "payment_events_privileged_read" on public.payment_events;
create policy "payment_events_privileged_read"
on public.payment_events for select to authenticated
using (public.loadlink_is_staff(array['finance','admin','owner']));
