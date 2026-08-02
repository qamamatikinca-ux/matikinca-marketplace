-- LoadLink contact stack + owner controls update.
-- Run this once in Supabase SQL Editor.

alter table public.job_listings add column if not exists owner_key text not null default '';
alter table public.job_listings add column if not exists view_count integer not null default 0;
alter table public.job_listings add column if not exists last_viewed_at timestamptz;
alter table public.job_listings add column if not exists whatsapp_number text not null default '';
alter table public.job_listings add column if not exists poster_photo text not null default '';

create or replace function public.delete_job_listing(p_job_id uuid, p_owner_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected_count integer;
begin
  delete from public.job_listings
  where id = p_job_id and owner_key = p_owner_key and length(owner_key) > 20;
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

create or replace function public.update_job_listing(
  p_job_id uuid, p_owner_key text, p_title text, p_city text,
  p_vehicle_group text, p_rate text, p_contact_number text, p_description text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected_count integer;
begin
  update public.job_listings set
    title = p_title, city = p_city, vehicle_group = p_vehicle_group,
    rate = p_rate, contact_number = p_contact_number, description = p_description
  where id = p_job_id and owner_key = p_owner_key and length(owner_key) > 20;
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

create or replace function public.increment_job_view(p_job_id uuid, p_viewer_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected_count integer;
begin
  update public.job_listings set view_count = coalesce(view_count, 0) + 1, last_viewed_at = now()
  where id = p_job_id and (owner_key is null or owner_key = '' or owner_key <> p_viewer_key);
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

grant execute on function public.delete_job_listing(uuid, text) to anon, authenticated;
grant execute on function public.update_job_listing(uuid, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.increment_job_view(uuid, text) to anon, authenticated;
