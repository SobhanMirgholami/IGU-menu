-- 09_item_options.sql
-- Item options (size, milk, extras), allergen and diet tags,
-- and place_order updated to validate and price options.

create table option_groups (
  id bigint generated always as identity primary key,
  name jsonb not null check (name ? 'tr' and name ? 'en' and name ? 'ar'),
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 1 check (max_select >= 1),
  sort_order int not null default 0,
  check (min_select <= max_select)
);

create table options (
  id bigint generated always as identity primary key,
  group_id bigint not null references option_groups(id) on delete restrict,
  name jsonb not null check (name ? 'tr' and name ? 'en' and name ? 'ar'),
  price_delta numeric(10,2) not null default 0 check (price_delta between -1000 and 1000),
  is_available boolean not null default true,
  sort_order int not null default 0
);

create table menu_item_option_groups (
  menu_item_id bigint not null references menu_items(id) on delete cascade,
  group_id bigint not null references option_groups(id) on delete cascade,
  sort_order int not null default 0,
  primary key (menu_item_id, group_id)
);

create table order_item_options (
  id bigint generated always as identity primary key,
  order_item_id bigint not null references order_items(id) on delete cascade,
  option_id bigint not null references options(id),
  name jsonb not null,
  price_delta numeric(10,2) not null
);

-- Allergens and diet tags: only known values allowed
alter table menu_items add constraint menu_items_allergens_known
  check (allergens <@ array['gluten', 'milk', 'nuts', 'peanuts', 'egg', 'soy', 'sesame', 'fish']::text[]);

alter table menu_items add column diet_tags text[] not null default '{}'
  check (diet_tags <@ array['vegan', 'vegetarian']::text[]);

-- RLS
alter table option_groups enable row level security;
alter table options enable row level security;
alter table menu_item_option_groups enable row level security;
alter table order_item_options enable row level security;

create policy "Anyone can read option groups"
  on option_groups for select to anon, authenticated using (true);

create policy "Anyone can read options"
  on options for select to anon, authenticated using (true);

create policy "Anyone can read item option links"
  on menu_item_option_groups for select to anon, authenticated using (true);

create policy "Managers add option groups"
  on option_groups for insert to authenticated with check (public.is_manager());

create policy "Managers update option groups"
  on option_groups for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "Managers add options"
  on options for insert to authenticated with check (public.is_manager());

create policy "Managers update options"
  on options for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "Managers link options to items"
  on menu_item_option_groups for insert to authenticated with check (public.is_manager());

create policy "Managers unlink options from items"
  on menu_item_option_groups for delete to authenticated using (public.is_manager());

create policy "Owners and staff see order item options"
  on order_item_options for select to authenticated
  using (
    public.is_staff() or exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_options.order_item_id
        and o.user_id = auth.uid()
    )
  );

-- Updated: options are validated and priced in the