create or replace function public.get_posting_experience_feedback(p_limit integer default 200)
returns table(id uuid,rating integer,comment text,surface text,listing_id uuid,listing_title text,user_email text,created_at timestamptz)
language plpgsql
security definer
set search_path to 'public','auth','pg_temp'
as $$
begin
  if not public.loadlink_is_staff(array['support','operations','admin','owner']) then
    raise exception 'Admin permission required';
  end if;

  return query
  select f.id,f.rating::integer,f.comment,f.surface,f.listing_id,f.listing_title,u.email::text,f.created_at
  from public.posting_experience_feedback f
  left join auth.users u on u.id=f.user_id
  order by f.created_at desc
  limit greatest(1,least(coalesce(p_limit,200),500));
end;
$$;
revoke all on function public.get_posting_experience_feedback(integer) from public,anon;
grant execute on function public.get_posting_experience_feedback(integer) to authenticated;
