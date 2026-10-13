-- 16_terms_check.sql
-- Before the login code is sent: does this email still need to accept the terms?
-- New students: yes (read + accept first). Returning students and café staff: no.
-- It only answers true/false and never says whether an account exists for other reasons.
-- Safe to run more than once.

create or replace function public.terms_needed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from auth.users u
    where char_length(p_email) <= 320
      and lower(u.email) = lower(btrim(p_email))
      and (
        exists (
          select 1 from public.terms_acceptances a
          where a.user_id = u.id and a.terms_version = public.current_terms_version()
        )
        or exists (select 1 from public.user_roles r where r.user_id = u.id) -- staff, manager, developer
      )
  );
$$;

revoke execute on function public.terms_needed(text) from public;
grant execute on function public.terms_needed(text) to anon, authenticated;
