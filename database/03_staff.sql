-- 03_staff.sql
-- Roles, staff permissions, order status updates, and realtime.

create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff', 'manager', 'developer')),
  created_at timestamptz not null default now()
);

alter table user_roles enable row level security;

create policy "Users can see their own role"
  on user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- Helper: is the current user café staff or manager?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('staff', 'manager')
  );
$$;

create policy "Staff see all orders"
  on orders for select
  to authenticated
  using (public.is_staff());

create policy "Staff see all order items"
  on order_items for select
  to authenticated
  using (public.is_staff());

-- Staff change order status, only in the allowed order
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
end;
$$;

revoke execute on function public.update_order_status(bigint, text) from public, anon;
grant execute on function public.update_order_status(bigint, text) to authenticated;

-- Send live updates when orders change
alter publication supabase_realtime add table public.orders;