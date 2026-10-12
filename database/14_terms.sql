-- 14_terms.sql
-- Students accept the Terms of Use before their first order.
-- When the terms change, bump current_terms_version() (and TERMS_VERSION in src/lib/legal.js)
-- and everyone is asked to accept again.
-- Safe to run more than once.

create table if not exists public.terms_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, terms_version)
);

alter table public.terms_acceptances enable row level security;

drop policy if exists "Users see their own acceptances" on public.terms_acceptances;
create policy "Users see their own acceptances"
  on public.terms_acceptances for select to authenticated
  using (user_id = auth.uid());

create or replace function public.current_terms_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select '2026-10-13'::text;
$$;

create or replace function public.accept_terms(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  if p_version is distinct from public.current_terms_version() then
    raise exception 'TERMS_OUTDATED';
  end if;

  insert into public.terms_acceptances (user_id, terms_version)
  values (auth.uid(), p_version)
  on conflict do nothing;
end;
$$;

revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

-- Updated: place_order now also checks the terms (everything else unchanged)
create or replace function public.place_order(p_items jsonb, p_pickup_at timestamptz, p_note text default null)
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

  -- New: the current terms must be accepted
  if not exists (
    select 1 from public.terms_acceptances
    where user_id = v_user and terms_version = public.current_terms_version()
  ) then
    raise exception 'Please accept the terms of use first';
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
