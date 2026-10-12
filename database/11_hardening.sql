-- 11_hardening.sql
-- Small security and performance cleanups suggested by the Supabase advisors.

-- Helper functions don't need to be callable by signed-out visitors
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_manager() from public, anon;
revoke execute on function public.is_university_email() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_university_email() to authenticated;

-- Indexes for foreign keys, so lookups and joins stay fast as orders grow
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_menu_item_id_idx on public.order_items (menu_item_id);
create index if not exists order_item_options_order_item_id_idx on public.order_item_options (order_item_id);
create index if not exists order_item_options_option_id_idx on public.order_item_options (option_id);
create index if not exists order_events_order_id_idx on public.order_events (order_id);
create index if not exists order_events_changed_by_idx on public.order_events (changed_by);
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);
create index if not exists options_group_id_idx on public.options (group_id);
create index if not exists menu_item_option_groups_group_id_idx on public.menu_item_option_groups (group_id);
