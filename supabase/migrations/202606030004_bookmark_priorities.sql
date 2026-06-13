create table if not exists public.bookmark_priorities (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  priority text not null check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create index if not exists bookmark_priorities_user_priority_idx
  on public.bookmark_priorities (user_id, priority);
