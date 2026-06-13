create table if not exists public.bookmark_sources (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  source_type text not null default 'search_results',
  source_label text not null,
  source_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create index if not exists bookmark_sources_user_account_idx
  on public.bookmark_sources (user_id, account_id);
