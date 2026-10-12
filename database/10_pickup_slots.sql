-- 10_pickup_slots.sql
-- Café settings, pickup time slots with capacity, and pause orders.

create table cafe_settings (
  id int primary key default 1 check (id = 1),
  is_accepting_orders boolean not null default true,
  open_time time not null default '08:00',
  close_time time not null default '18:00',
  slot_minutes int not null default 15 check (slot_minutes in (5, 10, 15, 20, 30, 60)),
  max_orders_per_slot int not null default 10 check (max_orders_per_slot between 1 and 200),
  min_lead_minutes int not null default 10 check (min_lead_minutes between 0 and 120),
  check (open_time < close_time),
  check (extract(minute from open_time)::int % slot_minutes = 0)
);

insert into cafe_settings (id) values (1);

alter table cafe_settings enable row level security;

create policy "Anyone can read cafe settings"
  on cafe_settings for select to anon, authenticated using (true);

create policy "Managers update cafe settings"
  on cafe_settings for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

alter table orders add column pickup_at timestamptz;

create index orders_pickup_at_idx on orders (pickup_at) where status <> 'cancelled';

alter publication supabase_realtime add table public.cafe_settings;

-- Staff pause or resume online orders
create or replace function public.set_accepting_orders(p_accepting boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can pause orders';
  end if;

  update public.cafe_settings set is_accepting_orders = p_accepting where id = 1;
end;
$$;

revoke execute on function public.set_accepting_orders(boolean) from public, anon;
grant execute on function public.set_accepting_orders(boolean) to authenticated;

-- Today's pickup slots with remaining capacity
create or replace function public.get_pickup_slots()
returns table (slot_start timestamptz, remaining int)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select * from public.cafe_settings where id = 1
  ),
  day as (
    select (now() at time zone 'Europe/Istanbul')::date as today
  )
  select
    g.slot_start,
    (s.max_orders_per_slot - (
      select count(*) from public.orders o
      where o.pickup_at = g.slot_start and o.status <> 'cancelled'
    ))::int
  from s, day,
    generate_series(
      (day.today + s.open_time) at time zone 'Europe/Istanbul',
      (day.today + s.close_time) at time zone 'Europe/Istanbul' - make_interval(mins => s.slot_minutes),
      make_interval(mins => s.slot_minutes)
    ) as g(slot_start)
  where s.is_accepting_orders
    and g.slot_start >= now() + make_interval(mins => s.min_lead_minutes);
$$;

revoke execute on function public.get_pickup_slots() from public, anon;
grant execute on function public.get_pickup_slots() to authenticated;

-- place_order gets a new parameter, so the old version must be removed first
drop function public.place_order(jsonb, text);

create function public.place_order(
  p_items jsonb,
  p_pickup_at timestamptz,
  p_note text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings record;
  v_local timestamp;
  v_taken int;
  v_order_id bigint;
  v_order_item_id bigint;
  v_total numeric(10,2) := 0;
  v_unit numeric(10,2);
  v_item jsonb;
  v_menu record;
  v_qty int;
  v_active int;
  v_option_json jsonb;
  v_option_ids bigint[];
  v_valid int;
begin
  if v_user is null then
    raise exception 'You must be logged in';
  end if;

  if not public.is_university_email() then
    raise exception 'Please sign in with your university email to order';
  end if;

  -- One order at a time per student (prevents race conditions)
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  -- Is the café taking orders, and is the pickup time valid?
  select * into v_settings from public.cafe_settings where id = 1;

  if not v_settings.is_accepting_orders then
    raise exception 'The café is not taking online orders right now';
  end if;

  if p_pickup_at is null then
    raise exception 'Choose a pickup time';
  end if;

  v_local := p_pickup_at at time zone 'Europe/Istanbul';

  if v_local::date <> (now() at time zone 'Europe/Istanbul')::date
     or v_local::time < v_settings.open_time
     or v_local::time > v_settings.close_time - make_interval(mins => v_settings.slot_minutes) then
    raise exception 'Pickup time is outside opening hours';
  end if;

  if extract(epoch from p_pickup_at)::bigint % (v_settings.slot_minutes * 60) <> 0 then
    raise exception 'Invalid pickup time';
  end if;

  if p_pickup_at < now() + make_interval(mins => v_settings.min_lead_minutes) then
    raise exception 'This pickup time is too soon. Please choose a later one.';
  end if;

  -- One booking at a time per slot (prevents overbooking the last spot)
  perform pg_advisory_xact_lock(hashtext('slot:' || p_pickup_at::text));

  select count(*) into v_taken
  from public.orders
  where pickup_at = p_pickup_at and status <> 'cancelled';

  if v_taken >= v_settings.max_orders_per_slot then
    raise exception 'This pickup time is full. Please choose another one.';
  end if;

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

  insert into public.orders (user_id, note, pickup_at)
  values (v_user, p_note, p_pickup_at)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;

    if v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'Invalid quantity';
    end if;

    select id, name, price into v_menu
    from public.menu_items
    where id = (v_item->>'menu_item_id')::bigint and is_available and not is_archived;

    if not found then
      raise exception 'Item is not available';
    end if;

    v_option_json := coalesce(v_item->'option_ids', '[]'::jsonb);

    if jsonb_typeof(v_option_json) <> 'array' or jsonb_array_length(v_option_json) > 10 then
      raise exception 'Invalid options';
    end if;

    select coalesce(array_agg(distinct value::bigint), '{}')
    into v_option_ids
    from jsonb_array_elements_text(v_option_json);

    if cardinality(v_option_ids) <> jsonb_array_length(v_option_json) then
      raise exception 'Duplicate options';
    end if;

    select count(*) into v_valid
    from public.options o
    join public.menu_item_option_groups l
      on l.group_id = o.group_id and l.menu_item_id = v_menu.id
    where o.id = any(v_option_ids) and o.is_available;

    if v_valid <> cardinality(v_option_ids) then
      raise exception 'Invalid option for this item';
    end if;

    if exists (
      select 1
      from public.menu_item_option_groups l
      join public.option_groups g on g.id = l.group_id
      where l.menu_item_id = v_menu.id
        and (
          select count(*) from public.options o
          where o.group_id = g.id and o.id = any(v_option_ids)
        ) not between g.min_select and g.max_select
    ) then
      raise exception 'Please choose the required options';
    end if;

    select v_menu.price + coalesce(sum(price_delta), 0)
    into v_unit
    from public.options
    where id = any(v_option_ids);

    if v_unit < 0 then
      raise exception 'Invalid price';
    end if;

    insert into public.order_items (order_id, menu_item_id, quantity, unit_price, item_name)
    values (v_order_id, v_menu.id, v_qty, v_unit, v_menu.name)
    returning id into v_order_item_id;

    insert into public.order_item_options (order_item_id, option_id, name, price_delta)
    select v_order_item_id, o.id, o.name, o.price_delta
    from public.options o
    where o.id = any(v_option_ids);

    v_total := v_total + v_unit * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(jsonb, timestamptz, text) from public, anon;
grant execute on function public.place_order(jsonb, timestamptz, text) to authenticated;