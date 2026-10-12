-- 02_orders.sql
-- Orders tables, RLS (students read only their own orders),
-- and place_order(): the only way to create an order.

create table orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total numeric(10,2) not null default 0 check (total >= 0),
  is_paid boolean not null default false,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create table order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  menu_item_id bigint not null references menu_items(id),
  quantity int not null check (quantity between 1 and 10),
  unit_price numeric(10,2) not null,
  item_name jsonb not null
);

alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Students see their own orders"
  on orders for select
  to authenticated
  using (user_id = auth.uid());

create policy "Students see items of their own orders"
  on order_items for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

-- place_order: validates the order, looks up real prices, saves everything.
-- Students never send prices; the database calculates them.

create or replace function public.place_order(p_items jsonb, p_note text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order_id bigint;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_menu record;
  v_qty int;
  v_active int;
begin
  if v_user is null then
    raise exception 'You must be logged in';
  end if;

  -- One order at a time per student (prevents race conditions)
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order is empty';
  end if;

  if jsonb_array_length(p_items) > 10 then
    raise exception 'Too many items in one order';
  end if;

  if p_note is not null and char_length(p_note) > 200 then
    raise exception 'Note is too long';
  end if;

  select count(*) into v_active
  from public.orders
  where user_id = v_user and status in ('pending', 'preparing', 'ready');

  if v_active >= 2 then
    raise exception 'You already have 2 active orders';
  end if;

  insert into public.orders (user_id, note)
  values (v_user, p_note)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;

    if v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'Invalid quantity';
    end if;

    select id, name, price into v_menu
    from public.menu_items
    where id = (v_item->>'menu_item_id')::bigint and is_available;

    if not found then
      raise exception 'Item is not available';
    end if;

    insert into public.order_items (order_id, menu_item_id, quantity, unit_price, item_name)
    values (v_order_id, v_menu.id, v_qty, v_menu.price, v_menu.name);

    v_total := v_total + v_menu.price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(jsonb, text) from public, anon;
grant execute on function public.place_order(jsonb, text) to authenticated;