revoke all on function public.set_listing_guest_message_star(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.set_listing_guest_message_star(uuid,text,boolean) to service_role;
