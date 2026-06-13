create table if not exists public.bookmark_folders (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.bookmark_folder_items (
  id bigint generated always as identity primary key,
  folder_id bigint not null references public.bookmark_folders(id) on delete cascade,
  user_id uuid not null,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (folder_id, account_id)
);

create index if not exists bookmark_folders_user_idx
  on public.bookmark_folders (user_id, created_at);

create index if not exists bookmark_folder_items_user_account_idx
  on public.bookmark_folder_items (user_id, account_id);
