-- 12_staff_pins.sql
-- One shared café terminal login + a personal PIN for each staff member.
-- Every staff action is logged with WHO did it and in WHICH shift.
--
-- How it works:
--   1. The café computer signs in once with the shared "staff" account.
--   2. A person taps their name and types their PIN  -> staff_unlock() gives back a session id.
--   3. Every staff action sends that session id       -> staff_actor() checks it and returns the person.
--   4. "Switch person" or 30 minutes without actions  -> the session ends and the PIN screen comes back.
-- Managers use their own personal account, so they don't need a PIN.
-- Safe to run more than once.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tables ----------

create table if not exists public.staff_members (
  id bigint generated always as identity primary key,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  pin_hash text not null,                      -- bcrypt hash, never the PIN itself
  is_active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists staff_members_active_name
  on public.staff_members (lower(btrim(display_name))) where is_active;

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_member_id bigint not null references public.staff_members(id),
  terminal_user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists staff_sessions_member on public.staff_sessions (staff_member_id);
create index if not exists staff_sessions_terminal on public.staff_sessions (terminal_user_id);

-- Actions that are not about one order (pause orders, sold out)
create table if not exists public.staff_activity (
  id bigint generated always as identity primary key,
  action text not null,
  details jsonb not null default '{}',
  user_id uuid references auth.users(id) on delete set null,
  staff_member_id bigint references public.staff_members(id),
  created_at timestamptz not null default now()
);

create index if not exists staff_activity_member on public.staff_activity (staff_member_id);
create index if not exists staff_activity_user on public.staff_activity (user_id);
create index if not exists staff_activity_time on public.staff_activity (created_at);

alter table public.order_events add column if not exists staff_member_id bigint references public.staff_members(id);
create index if not exists order_events_member on public.order_events (staff_member_id);

-- RLS on, and NO policies: nobody reads these tables directly.
-- Everything goes through the functions below, which check the role first.
alter table public.staff_members enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.staff_activity enable row level security;

-- ---------- Who is acting? ----------

-- Managers: returns null (they act as themselves).
-- Shared staff account: needs a live PIN session, otherwise 'PIN_REQUIRED'.
create or replace function public.staff_actor(p_session uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member bigint;
begin
  if public.is_manager() then
    return null;
  end if;

  if not public.is_staff() then
    raise exception 'Only staff can do this';
  end if;

  update public.staff_sessions s
  set last_seen_at = now()
  from public.staff_members m
  where s.id = p_session
    and m.id = s.staff_member_id
    and m.is_active
    and s.terminal_user_id = auth.uid()
    and s.ended_at is null
    and s.last_seen_at > now() - interval '30 minutes'   -- idle limit
    and s.started_at > now() - interval '12 hours'       -- one shift at most
  returning s.staff_member_id into v_member;

  if v_member is null then
    raise exception 'PIN_REQUIRED';
  end if;

  return v_member;
end;
$$;

revoke execute on function public.staff_actor(uuid) from public, anon, authenticated;

-- ---------- PIN screen ----------

-- Names shown on the terminal's "Who's working?" screen
create or replace function public.terminal_staff_list()
returns table (id bigint, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.display_name
  from public.staff_members m
  where m.is_active and public.is_staff()
  order by lower(m.display_name);
$$;

-- Checks the PIN. Returns {"ok": true, "session": "..."} or {"ok": false, "error": "..."}.
-- (It returns errors instead of raising them, so the failed-try counter is saved.)
create or replace function public.staff_unlock(p_staff_id bigint, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.staff_members;
  v_session uuid;
begin
  if not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'NOT_STAFF');
  end if;

  select * into v_member
  from public.staff_members
  where id = p_staff_id and is_active
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if v_member.locked_until is not null and v_member.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'LOCKED', 'until', v_member.locked_until);
  end if;

  if p_pin is null or v_member.pin_hash <> extensions.crypt(p_pin, v_member.pin_hash) then
    -- 5 wrong PINs in a row -> locked for 5 minutes
    update public.staff_members
    set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else locked_until end
    where id = p_staff_id;

    return jsonb_build_object('ok', false, 'error',
      case when v_member.failed_attempts + 1 >= 5 then 'LOCKED' else 'WRONG_PIN' end);
  end if;

  update public.staff_members set failed_attempts = 0, locked_until = null where id = p_staff_id;

  insert into public.staff_sessions (staff_member_id, terminal_user_id)
  values (p_staff_id, auth.uid())
  returning id into v_session;

  return jsonb_build_object('ok', true, 'session', v_session, 'name', v_member.display_name);
end;
$$;

-- "Switch person": end this session
create or replace function public.staff_lock(p_session uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.staff_sessions
  set ended_at = now()
  where id = p_session and terminal_user_id = auth.uid() and ended_at is null;
$$;

-- Is my saved session still alive? (used when the page reloads)
create or replace function public.staff_session_check(p_session uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('ok', true, 'name', m.display_name)
     from public.staff_sessions s
     join public.staff_members m on m.id = s.staff_member_id
     where s.id = p_session
       and s.terminal_user_id = auth.uid()
       and m.is_active
       and s.ended_at is null
       and s.last_seen_at > now() - interval '30 minutes'
       and s.started_at > now() - interval '12 hours'),
    jsonb_build_object('ok', false));
$$;

-- ---------- Manager: staff list and PINs ----------

create or replace function public.check_pin_format(p_pin text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN_FORMAT';
  end if;
  -- refuse the easiest guesses: 0000, 1111, 1234, 123456, 4321 ...
  if p_pin ~ '^(.)\1+$' or '0123456789' like '%' || p_pin || '%' or '9876543210' like '%' || p_pin || '%' then
    raise exception 'PIN_TOO_EASY';
  end if;
end;
$$;

create or replace function public.manager_staff_list()
returns table (id bigint, display_name text, is_active boolean, locked_until timestamptz,
               created_at timestamptz, last_seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Only the manager can see staff';
  end if;

  return query
  select m.id, m.display_name, m.is_active, m.locked_until, m.created_at,
         (select max(s.last_seen_at) from public.staff_sessions s where s.staff_member_id = m.id)
  from public.staff_members m
  order by m.is_active desc, lower(m.display_name);
end;
$$;

create or replace function public.create_staff_member(p_name text, p_pin text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not public.is_manager() then
    raise exception 'Only the manager can add staff';
  end if;

  perform public.check_pin_format(p_pin);

  if exists (select 1 from public.staff_members
             where is_active and lower(btrim(display_name)) = lower(btrim(p_name))) then
    raise exception 'NAME_TAKEN';
  end if;

  insert into public.staff_members (display_name, pin_hash)
  values (btrim(p_name), extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_staff_member(p_id bigint, p_name text, p_pin text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Only the manager can edit staff';
  end if;

  if exists (select 1 from public.staff_members
             where is_active and id <> p_id and lower(btrim(display_name)) = lower(btrim(p_name))) then
    raise exception 'NAME_TAKEN';
  end if;

  if p_pin is not null and p_pin <> '' then
    perform public.check_pin_format(p_pin);
    update public.staff_members
    set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
        failed_attempts = 0, locked_until = null
    where id = p_id;
    -- a new PIN signs this person out everywhere
    update public.staff_sessions set ended_at = now() where staff_member_id = p_id and ended_at is null;
  end if;

  update public.staff_members set display_name = btrim(p_name) where id = p_id;
  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

-- Turning someone off keeps their history but stops their PIN and signs them out
create or replace function public.set_staff_active(p_id bigint, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Only the manager can change staff';
  end if;

  if p_active and exists (
    select 1 from public.staff_members a
    join public.staff_members b on lower(btrim(a.display_name)) = lower(btrim(b.display_name))
    where a.id = p_id and b.is_active and b.id <> p_id
  ) then
    raise exception 'NAME_TAKEN';
  end if;

  update public.staff_members set is_active = p_active, failed_attempts = 0, locked_until = null where id = p_id;
  if not found then
    raise exception 'Staff member not found';
  end if;

  if not p_active then
    update public.staff_sessions set ended_at = now() where staff_member_id = p_id and ended_at is null;
  end if;
end;
$$;

-- ---------- Staff actions, now with the person ----------
-- The old versions (without p_session) are removed, so nobody can skip the PIN.

drop function if exists public.update_order_status(bigint, text);
drop function if exists public.mark_order_paid(bigint);
drop function if exists public.set_accepting_orders(boolean);
drop function if exists public.set_item_availability(bigint, boolean);

create or replace function public.update_order_status(p_order_id bigint, p_status text, p_session uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_paid boolean;
  v_member bigint;
begin
  v_member := public.staff_actor(p_session);

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

  insert into public.order_events (order_id, status, changed_by, staff_member_id)
  values (p_order_id, p_status, auth.uid(), v_member);
end;
$$;

create or replace function public.mark_order_paid(p_order_id bigint, p_session uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_paid boolean;
  v_member bigint;
begin
  v_member := public.staff_actor(p_session);

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

  insert into public.order_events (order_id, status, changed_by, staff_member_id)
  values (p_order_id, 'paid', auth.uid(), v_member);
end;
$$;

create or replace function public.set_accepting_orders(p_accepting boolean, p_session uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member bigint;
begin
  v_member := public.staff_actor(p_session);

  update public.cafe_settings set is_accepting_orders = p_accepting where id = 1;

  insert into public.staff_activity (action, user_id, staff_member_id)
  values (case when p_accepting then 'orders_resumed' else 'orders_paused' end, auth.uid(), v_member);
end;
$$;

create or replace function public.set_item_availability(p_item_id bigint, p_available boolean, p_session uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member bigint;
  v_name jsonb;
begin
  v_member := public.staff_actor(p_session);

  update public.menu_items
  set is_available = p_available
  where id = p_item_id and not is_archived
  returning name into v_name;

  if not found then
    raise exception 'Item not found';
  end if;

  insert into public.staff_activity (action, details, user_id, staff_member_id)
  values (case when p_available then 'item_available' else 'item_sold_out' end,
          jsonb_build_object('item_id', p_item_id, 'name', v_name), auth.uid(), v_member);
end;
$$;

-- ---------- Manager: activity log ----------

create or replace function public.staff_activity_log(p_from date, p_to date)
returns table (happened_at timestamptz, shift text, person text, by_manager boolean, action text,
               order_id bigint, details jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Only the manager can see the activity log';
  end if;

  return query
  with events as (
    select e.changed_at as event_time, e.changed_by as user_id, e.staff_member_id,
           ('order_' || e.status) as action, e.order_id, '{}'::jsonb as details
    from public.order_events e
    union all
    select a.created_at, a.user_id, a.staff_member_id, a.action, null::bigint, a.details
    from public.staff_activity a
  )
  select ev.event_time,
         public.shift_for(ev.event_time),
         coalesce(m.display_name, split_part(u.email, '@', 1), '?'),
         m.id is null,
         ev.action,
         ev.order_id,
         ev.details
  from events ev
  left join public.staff_members m on m.id = ev.staff_member_id
  left join auth.users u on u.id = ev.user_id
  where (ev.event_time at time zone 'Europe/Istanbul')::date between p_from and p_to
  order by ev.event_time desc
  limit 500;
end;
$$;

-- ---------- Who may call what ----------

revoke execute on function public.terminal_staff_list() from public, anon;
revoke execute on function public.staff_unlock(bigint, text) from public, anon;
revoke execute on function public.staff_lock(uuid) from public, anon;
revoke execute on function public.staff_session_check(uuid) from public, anon;
revoke execute on function public.check_pin_format(text) from public, anon, authenticated;
revoke execute on function public.manager_staff_list() from public, anon;
revoke execute on function public.create_staff_member(text, text) from public, anon;
revoke execute on function public.update_staff_member(bigint, text, text) from public, anon;
revoke execute on function public.set_staff_active(bigint, boolean) from public, anon;
revoke execute on function public.update_order_status(bigint, text, uuid) from public, anon;
revoke execute on function public.mark_order_paid(bigint, uuid) from public, anon;
revoke execute on function public.set_accepting_orders(boolean, uuid) from public, anon;
revoke execute on function public.set_item_availability(bigint, boolean, uuid) from public, anon;
revoke execute on function public.staff_activity_log(date, date) from public, anon;

grant execute on function public.terminal_staff_list() to authenticated;
grant execute on function public.staff_unlock(bigint, text) to authenticated;
grant execute on function public.staff_lock(uuid) to authenticated;
grant execute on function public.staff_session_check(uuid) to authenticated;
grant execute on function public.manager_staff_list() to authenticated;
grant execute on function public.create_staff_member(text, text) to authenticated;
grant execute on function public.update_staff_member(bigint, text, text) to authenticated;
grant execute on function public.set_staff_active(bigint, boolean) to authenticated;
grant execute on function public.update_order_status(bigint, text, uuid) to authenticated;
grant execute on function public.mark_order_paid(bigint, uuid) to authenticated;
grant execute on function public.set_accepting_orders(boolean, uuid) to authenticated;
grant execute on function public.set_item_availability(bigint, boolean, uuid) to authenticated;
grant execute on function public.staff_activity_log(date, date) to authenticated;
