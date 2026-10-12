-- 01_menu.sql
-- Menu tables: categories and menu_items, with RLS (read-only for everyone).

create table categories (
  id bigint generated always as identity primary key,
  name jsonb not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table menu_items (
  id bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete restrict,
  name jsonb not null,
  description jsonb,
  price numeric(10,2) not null check (price >= 0),
  is_available boolean not null default true,
  allergens text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table menu_items enable row level security;

create policy "Anyone can read categories"
  on categories for select
  to anon, authenticated
  using (true);

create policy "Anyone can read menu items"
  on menu_items for select
  to anon, authenticated
  using (true);

-- Sample data (for development and the demo only)

insert into categories (name, sort_order) values
  ('{"tr": "Sıcak İçecekler", "en": "Hot Drinks", "ar": "مشروبات ساخنة"}', 1),
  ('{"tr": "Soğuk İçecekler", "en": "Cold Drinks", "ar": "مشروبات باردة"}', 2),
  ('{"tr": "Yiyecekler", "en": "Food", "ar": "مأكولات"}', 3);

insert into menu_items (category_id, name, price, allergens, sort_order) values
  (1, '{"tr": "Espresso", "en": "Espresso", "ar": "إسبريسو"}', 45, '{}', 1),
  (1, '{"tr": "Latte", "en": "Latte", "ar": "لاتيه"}', 60, '{milk}', 2),
  (2, '{"tr": "Buzlu Latte", "en": "Iced Latte", "ar": "لاتيه مثلج"}', 65, '{milk}', 1),
  (3, '{"tr": "Kruvasan",