-- Search approved drivers by all entered words, regardless of word order.
-- Preserve the existing return columns, public-approval checks, moderation behaviour,
-- paging and SECURITY DEFINER search_path. Do not expose documents or private profiles.
create or replace function public.loadlink_public_driver_profiles(
  p_limit integer default 8,
  p_offset integer default 0,
  p_city text default null,
  p_search text default null
)
returns table(
  id uuid, user_id uuid, full_name text, profile_image_url text,
  headline text, city text, province text, years_experience integer,
  licence_code text, vehicle_types text[], bio text, availability text,
  verification_level text, average_rating numeric, review_count bigint,
  total_count bigint
)
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $function$
select
  p.id,p.user_id,p.full_name,p.profile_image_url,p.headline,p.city,p.province,
  p.years_experience,p.licence_code,p.vehicle_types,p.bio,p.availability,
  p.verification_level,
  coalesce(r.average_rating,0)::numeric,
  coalesce(r.completed_jobs,0)::bigint,
  count(*) over()::bigint
from public.driver_profiles p
left join lateral (
  select round(avg(f.rating)::numeric,1) as average_rating,
         count(distinct a.listing_id)::bigint as completed_jobs
  from public.job_driver_assignments a
  join public.job_closures c
    on c.listing_id=a.listing_id and c.outcome='completed'
  left join public.driver_completion_feedback f on f.assignment_id=a.id
  where a.driver_profile_id=p.id
    and a.status in('accepted','in_transit','delivery_reported','completed')
) r on true
where p.status='approved'
  and (p.profile_expires_at is null or p.profile_expires_at>now())
  and (nullif(trim(coalesce(p_city,'')),'') is null or p.city ilike '%'||trim(p_city)||'%')
  and (
    nullif(trim(coalesce(p_search,'')),'') is null
    or not exists (
      select 1
      from regexp_split_to_table(trim(p_search),'[[:space:]]+') as term(word)
      where term.word <> ''
        and strpos(
          lower(concat_ws(' ',p.full_name,p.headline,p.city,p.province,
                          p.licence_code,array_to_string(p.vehicle_types,' '),p.bio)),
          lower(term.word)
        ) = 0
    )
  )
order by p.approved_at desc nulls last,p.updated_at desc
limit greatest(1,least(coalesce(p_limit,8),50))
offset greatest(coalesce(p_offset,0),0);
$function$;
