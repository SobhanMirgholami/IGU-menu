-- 06 (safe re-run): finishes menu management setup

alter table menu_items add column if not exists is_archived boolean not null default false;

alter table menu_items drop constraint if exists menu_items_name_languages;
alter table menu_items add constraint menu_items_name_languages
  check (name ? 'tr' and name ? 'en' and name ? 'ar');

alter table categories drop constraint if exists categories_name_languages;
alter table categories add constraint categories_name_languages
  check (name ? 'tr' and name ? 'en' and name ? 'ar');

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'manager'
  );
$$;

drop policy if exists "Anyone can read menu items" on menu_items;
drop policy if exists "Anyone can read active menu items" on menu_items;
drop policy if exists "Managers read all menu items" on menu_items;
drop policy if exists "Managers add menu items" on menu_items;
drop policy if exists "Managers update menu items" on menu_items;
drop policy if exists "Managers add categories" on categories;
drop policy if exists "Managers update categories" on categories;

create policy "Anyone can read active menu items"
  on menu_items for select
  to anon, authenticated
  using (not is_archived);

create policy "Managers read all menu items"
  on menu_items for select
  to authenticated
  using (public.is_manager());

create policy "Managers add menu items"
  on menu_items for insert
  to authenticated
  with check (public.is_manager());

create policy "Managers update menu items"
  on menu_items for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy "Managers add categories"
  on categories for insert
  to authenticated
  with check (public.is_manager());

create policy "Managers update categories"
  on categories for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create or replace function public.set_item_availability(p_item_id bigint, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can change availability';
  end if;

  update public.menu_items
  set is_available = p_available
  where id = p_item_id and not is_archived;

  if not found then
    raise exception 'Item not found';
  end if;
end;
$$;

revoke execute on function public.set_item_availability(bigint, boolean) from public, anon;
grant execute on function public.set_item_availability(bigint, boolean) to authenticated;