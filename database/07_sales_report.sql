-- 07_sales_report.sql
-- Manager-only sales report for a date range and hour range (Istanbul time).
-- Each item includes "name" (Turkish) and "names" (all languages).

create or replace function public.sales_report(
  p_from date,
  p_to date,
  p_hour_from int default 0,
  p_hour_to int default 24
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_manager() then
    raise exception 'Only the manager can view reports';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid date range';
  end if;

  if p_to - p_from > 366 then
    raise exception 'Date range is too long (max 1 year)';
  end if;

  if p_hour_from < 0 or p_hour_to > 24 or p_hour_from >= p_hour_to then
    raise exception 'Invalid hour range';
  end if;

  with in_range as (
    select
      o.id,
      o.status,
      o.total,
      o.created_at at time zone 'Europe/Istanbul' as local_time
    from public.orders o
    where o.created_at >= (p_from::timestamp at time zone 'Europe/Istanbul')
      and o.created_at < ((p_to + 1)::timestamp at time zone 'Europe/Istanbul')
  ),
  in_hours as (
    select * from in_range
    where extract(hour from local_time) >= p_hour_from
      and extract(hour from local_time) < p_hour_to
  ),
  done as (
    select * from in_hours where status = 'completed'
  )
  select jsonb_build_object(
    'income',    coalesce((select sum(total) from done), 0),
    'orders',    (select count(*) from done),
    'average',   coalesce((select round(avg(total), 2) from done), 0),
    'cancelled', (select count(*) from in_hours where status = 'cancelled'),
    'items', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.quantity desc)
      from (
        select
          m.name->>'tr' as name,
          m.name as names,
          sum(oi.quantity)::int as quantity,
          sum(oi.quantity * oi.unit_price) as income
        from public.order_items oi
        join done d on d.id = oi.order_id
        join public.menu_items m on m.id = oi.menu_item_id
        group by m.id, m.name
      ) x
    ), '[]'::jsonb),
    'by_hour', coalesce((
      select jsonb_agg(to_jsonb(h) order by h.hour)
      from (
        select
          extract(hour from local_time)::int as hour,
          count(*)::int as orders,
          sum(total) as income
        from done
        group by 1
      ) h
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.sales_report(date, date, int, int) from public, anon;
grant execute on function public.sales_report(date, date, int, int) to authenticated;
