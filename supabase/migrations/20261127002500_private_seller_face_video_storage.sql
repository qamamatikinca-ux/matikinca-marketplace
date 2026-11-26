-- Guided private-seller verification records short MP4/WebM evidence.
-- The former bucket MIME allowlist rejected every successfully captured video.
-- Keep this bucket private; restrict sizes to the existing 10 MB cap.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','application/pdf',
  'video/mp4','video/webm'
]::text[]
where id='vehicle-verification'
  and public=false;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id='vehicle-verification' and public=false
      and allowed_mime_types @> array['video/mp4','video/webm']::text[]
  ) then
    raise exception 'Private vehicle face video allowlist was not updated';
  end if;
end;
$$;
