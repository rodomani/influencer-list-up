create table if not exists public.bookmark_memos (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  memo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create index if not exists bookmark_memos_user_account_idx
  on public.bookmark_memos (user_id, account_id);
