-- 08_university_email.sql
-- Only students with a university email can place orders.

create table allowed_email_domains (
  domain text primary key
    check (domain = lower(domain) and domain not like '%@%' and domain like '%.%')
);

alter table allowed_email_domains enable row level security;

create policy "Anyone can read allowed domains"
  on allowed_email_domains for select
  to anon, authenticated
  using (true);

create or replace function public.is_university_email()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.allowed_email_domains d
      on d.domain = lower(split_part(u.email, '@', 2))
    where u.id = auth.uid()
  );
$$;

-- Updated: university email required to order
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

  if not public.is_university_email() then
    raise exception 'Please sign in with your university email to order';
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
    where id = (v_item->>'menu_item_id')::bigint and is_available and not is_archived;

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