-- 15_push.sql
-- Web Push: each phone that allows notifications gets a "push address" (subscription).
-- The notify-order-ready Edge Function reads these to send "your order is ready".
-- Safe to run more than once.

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  lang text not null default 'tr' check (lang in ('tr', 'en', 'ar')),
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

-- RLS on, no policies: only the functions below and the Edge Function (service role) touch it
alter table public.push_subscriptions enable row level security;

-- So one order never gets two "ready" pushes
alter table public.orders add column if not exists ready_push_sent_at timestamptz;

-- Save this phone for the signed-in user. A phone belongs to whoever signed in last.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be logged in';
  end if;

  if p_endpoint !~ '^https://' then
    raise exception 'Invalid push endpoint';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, lang)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth,
          case when p_lang in ('tr', 'en', 'ar') then p_lang else 'tr' end);

  -- keep at most 5 devices per person (oldest go first)
  delete from public.push_subscriptions
  where id in (
    select id from public.push_subscriptions
    where user_id = auth.uid()
    order by created_at desc
    offset 5
  );
end;
$$;

-- Forget this phone (on sign out)
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;
