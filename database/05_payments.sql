-- 05_payments.sql
-- Staff mark orders as paid. Paid orders can't be cancelled,
-- and orders must be paid before pickup.

create or replace function public.mark_order_paid(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_paid boolean;
begin
  if not public.is_staff() then
    raise exception 'Only staff can update orders';
  end if;

  select status, is_paid into v_status, v_paid
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_status = 'cancelled' then
    raise exception 'Cannot mark a cancelled order as paid';
  end if;

  if v_paid then
    raise exception 'Order is already paid';
  end if;

  update public.orders set is_paid = true where id = p_order_id;

  insert into public.order_events (order_id, status, changed_by)
  values (p_order_id, 'paid', auth.uid());
end;
$$;

revoke execute on function public.mark_order_paid(bigint) from public, anon;
grant execute on function public.mark_order_paid(bigint) to authenticated;

-- Updated: pickup requires payment, paid orders can't be cancelled
create or replace function public.update_order_status(p_order_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_paid boolean;
begin
  if not public.is_staff() then
    raise exception 'Only staff can update orders';
  end if;

  select status, is_paid into v_current, v_paid
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

  if p_status = 'completed' and not v_paid then
    raise exception 'Order must be paid before pickup';
  end if;

  if p_status = 'cancelled' and v_paid then
    raise exception 'Paid orders cannot be cancelled. Ask the manager about a refund.';
  end if;

  update public.orders set status = p_status where id = p_order_id;

  insert into public.order_events (order_id, status, changed_by)
  values (p_order_id, p_status, auth.uid());
end;
$$;

revoke execute on function public.update_order_status(bigint, text) from public, anon;
grant execute on function public.update_order_status(bigint, text) to authenticated;