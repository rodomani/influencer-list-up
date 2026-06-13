create table if not exists public.bookmark_tags (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.bookmark_tag_items (
  id bigint generated always as identity primary key,
  tag_id bigint not null references public.bookmark_tags(id) on delete cascade,
  user_id uuid not null,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tag_id, account_id)
);

create index if not exists bookmark_tags_user_idx
  on public.bookmark_tags (user_id, created_at);

create index if not exists bookmark_tag_items_user_account_idx
  on public.bookmark_tag_items (user_id, account_id);
