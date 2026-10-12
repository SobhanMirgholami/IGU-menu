-- 13_bug_reports.sql
-- Students and staff report problems; the developer (and manager) see and track them.
-- Safe to run more than once.

create table if not exists public.bug_reports (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,                                   -- so the developer can reply
  role text not null default 'student',
  message text not null check (char_length(message) between 10 and 2000),
  page text check (char_length(page) <= 100),
  lang text check (char_length(lang) <= 10),
  device text check (char_length(device) <= 400),
  status text not null default 'new' check (status in ('new', 'in_progress', 'fixed', 'wont_fix')),
  dev_note text check (char_length(dev_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bug_reports_user on public.bug_reports (user_id);
create index if not exists bug_reports_status on public.bug_reports (status, created_at desc);

alter table public.bug_reports enable row level security;

-- Developer role (you). Managers can also see reports from their café.
create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'developer'
  );
$$;

drop policy if exists "Developers and managers read bug reports" on public.bug_reports;
create policy "Developers and managers read bug reports"
  on public.bug_reports for select to authenticated
  using (public.is_developer() or public.is_manager());

-- No insert/update policies: writing only happens through the functions below.

-- Send a report. Max 5 per person per day, so it can't be used for spam.
create or replace function public.submit_bug_report(p_message text, p_page text, p_lang text, p_device text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_message text := btrim(coalesce(p_message, ''));
  v_id bigint;
begin
  if v_user is null then
    raise exception 'You must be logged in';
  end if;

  if char_length(v_message) < 10 then
    raise exception 'BUG_TOO_SHORT';
  end if;

  if char_length(v_message) > 2000 then
    raise exception 'BUG_TOO_LONG';
  end if;

  if (select count(*) from public.bug_reports
      where user_id = v_user and created_at > now() - interval '1 day') >= 5 then
    raise exception 'BUG_LIMIT';
  end if;

  insert into public.bug_reports (user_id, email, role, message, page, lang, device)
  values (
    v_user,
    (select email from auth.users where id = v_user),
    coalesce((select role from public.user_roles where user_id = v_user), 'student'),
    v_message,
    left(p_page, 100),
    left(p_lang, 10),
    left(p_device, 400)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Change status / add a note
create or replace function public.update_bug_report(p_id bigint, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_developer() or public.is_manager()) then
    raise exception 'Only the developer can update bug reports';
  end if;

  update public.bug_reports
  set status = p_status,
      dev_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Bug report not found';
  end if;
end;
$$;

revoke execute on function public.is_developer() from public, anon;
revoke execute on function public.submit_bug_report(text, text, text, text) from public, anon;
revoke execute on function public.update_bug_report(bigint, text, text) from public, anon;
grant execute on function public.is_developer() to authenticated;
grant execute on function public.submit_bug_report(text, text, text, text) to authenticated;
grant execute on function public.update_bug_report(bigint, text, text) to authenticated;
