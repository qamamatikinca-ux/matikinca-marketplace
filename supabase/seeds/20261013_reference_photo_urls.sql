-- Correct reference URL formatting only; no user or financial data is modified.
update public.loadlink_truck_model_catalog
set photo_url = regexp_replace(photo_url, ':$', '')
where photo_url like 'https://upload.wikimedia.org/%.jpg:';
