drop policy if exists "custom package requests read own or control centre" on public.custom_package_requests;
drop policy if exists "custom package requests control centre review" on public.custom_package_requests;
drop policy if exists "custom package requests read own" on public.custom_package_requests;
create policy "custom package requests read own"
on public.custom_package_requests for select to authenticated
using (user_id=auth.uid());

-- Package reviews are performed through the staff-checked review RPC.
-- No direct authenticated UPDATE policy is intentionally recreated.

drop policy if exists "staff_roles_owner_admin_insert" on public.staff_roles;
drop policy if exists "staff_roles_owner_admin_update" on public.staff_roles;
drop policy if exists "staff_roles_owner_admin_delete" on public.staff_roles;
create policy "staff_roles_owner_admin_insert"
on public.staff_roles for insert to authenticated
with check (public.loadlink_phase2_admin_role() in ('owner','admin'));
create policy "staff_roles_owner_admin_update"
on public.staff_roles for update to authenticated
using (public.loadlink_phase2_admin_role() in ('owner','admin'))
with check (public.loadlink_phase2_admin_role() in ('owner','admin'));
create policy "staff_roles_owner_admin_delete"
on public.staff_roles for delete to authenticated
using (public.loadlink_phase2_admin_role() in ('owner','admin'));
