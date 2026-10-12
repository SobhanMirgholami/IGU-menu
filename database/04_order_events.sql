-- 04_order_events.sql
-- Logs every order status change: who, when, and which shift.

create table order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table order_events enable row level security;

create policy "Staff see order events"
  on order_events for select
  to authenticated
  using (public.is_staff());

-- Which shift a moment belongs to (Istanbul time)
create or replace function public.shift_for(p_time timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when extract(hour from p_time at time zone 'Europe/Istanbul') < 15 then 'morning'
    else 'evening'
  end;
$$;

-- Updated: now also logs every change
create or replace function public.update_order_status(p_order_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
begin
  if not public.is_staff() then
    raise exception 'Only staff can update orders';
  end if;

  select status into v_current
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if not (
    (v_current = 'pending'   and p_status in ('preparing', 'cancelled')) or
    (v_current = 'preparing' and p_status in ('ready', 'cancelled')) or
    (v_current = 'ready'     and p_status in ('completed', 'cancelled'))
  ) then
    raise exception 'Cannot change order from % to %', v_current, p_status;
  end if;

  update public.orders set status = p_status where id = p_order_id;

  insert into public.order_events (order_id, status, changed_by)
  values (p_order_id, p_status, auth.uid());
end;
$$;

revoke execute on function public.update_order_status(bigint, text) from public, anon;
grant execute on function public.update_order_status(bigint, text) to authenticated;