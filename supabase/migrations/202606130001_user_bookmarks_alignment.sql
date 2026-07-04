create table if not exists public.user_bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  priority text,
  personal_rating smallint,
  candidate_readiness text,
  risk_level text,
  risk_notes text,
  estimated_price_min numeric,
  estimated_price_max numeric,
  price_note text,
  price_checked_at timestamptz,
  contact_info jsonb not null default '{}'::jsonb,
  saved_snapshot jsonb,
  research_checklist jsonb not null default '{}'::jsonb,
  saved_reason text,
  private_memo text,
  saved_source text,
  saved_source_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

alter table public.user_bookmarks
  add column if not exists priority text,
  add column if not exists personal_rating smallint,
  add column if not exists candidate_readiness text,
  add column if not exists risk_level text,
  add column if not exists risk_notes text,
  add column if not exists estimated_price_min numeric,
  add column if not exists estimated_price_max numeric,
  add column if not exists price_note text,
  add column if not exists price_checked_at timestamptz,
  add column if not exists contact_info jsonb default '{}'::jsonb,
  add column if not exists saved_snapshot jsonb,
  add column if not exists research_checklist jsonb default '{}'::jsonb,
  add column if not exists saved_reason text,
  add column if not exists private_memo text,
  add column if not exists saved_source text,
  add column if not exists saved_source_detail jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.user_bookmarks
set
  contact_info = coalesce(contact_info, '{}'::jsonb),
  research_checklist = coalesce(research_checklist, '{}'::jsonb),
  saved_source_detail = coalesce(saved_source_detail, '{}'::jsonb)
where
  contact_info is null
  or research_checklist is null
  or saved_source_detail is null;

alter table public.user_bookmarks
  alter column contact_info set default '{}'::jsonb,
  alter column contact_info set not null,
  alter column research_checklist set default '{}'::jsonb,
  alter column research_checklist set not null,
  alter column saved_source_detail set default '{}'::jsonb,
  alter column saved_source_detail set not null;

alter table public.user_bookmarks
  drop constraint if exists user_bookmarks_user_id_fkey;

alter table public.user_bookmarks
  add constraint user_bookmarks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bookmarks_priority_check'
      and conrelid = 'public.user_bookmarks'::regclass
  ) then
    alter table public.user_bookmarks
      add constraint user_bookmarks_priority_check
      check (priority is null or priority in ('high', 'medium', 'low'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bookmarks_personal_rating_check'
      and conrelid = 'public.user_bookmarks'::regclass
  ) then
    alter table public.user_bookmarks
      add constraint user_bookmarks_personal_rating_check
      check (personal_rating is null or personal_rating between 1 and 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bookmarks_risk_level_check'
      and conrelid = 'public.user_bookmarks'::regclass
  ) then
    alter table public.user_bookmarks
      add constraint user_bookmarks_risk_level_check
      check (risk_level is null or risk_level in ('low', 'medium', 'high', 'unknown'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bookmarks_estimated_price_min_check'
      and conrelid = 'public.user_bookmarks'::regclass
  ) then
    alter table public.user_bookmarks
      add constraint user_bookmarks_estimated_price_min_check
      check (estimated_price_min is null or estimated_price_min >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bookmarks_estimated_price_max_check'
      and conrelid = 'public.user_bookmarks'::regclass
  ) then
    alter table public.user_bookmarks
      add constraint user_bookmarks_estimated_price_max_check
      check (estimated_price_max is null or estimated_price_max >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_bookmarks_user_id_account_id_key'
      and conrelid = 'public.user_bookmarks'::regclass
  ) then
    alter table public.user_bookmarks
      add constraint user_bookmarks_user_id_account_id_key
      unique (user_id, account_id);
  end if;
end
$$;

insert into public.user_bookmarks (
  user_id,
  account_id,
  priority,
  created_at,
  updated_at
)
select
  bp.user_id,
  bp.account_id,
  bp.priority,
  bp.created_at,
  bp.updated_at
from public.bookmark_priorities bp
on conflict (user_id, account_id) do update
set
  priority = excluded.priority,
  updated_at = greatest(public.user_bookmarks.updated_at, excluded.updated_at);

insert into public.user_bookmarks (
  user_id,
  account_id,
  saved_reason,
  created_at,
  updated_at
)
select
  bm.user_id,
  bm.account_id,
  bm.memo,
  bm.created_at,
  bm.updated_at
from public.bookmark_memos bm
on conflict (user_id, account_id) do update
set
  saved_reason = coalesce(public.user_bookmarks.saved_reason, excluded.saved_reason),
  updated_at = greatest(public.user_bookmarks.updated_at, excluded.updated_at);

insert into public.user_bookmarks (
  user_id,
  account_id,
  saved_source,
  saved_source_detail,
  created_at,
  updated_at
)
select
  bs.user_id,
  bs.account_id,
  bs.source_type,
  coalesce(
    jsonb_build_object(
      'label',
      bs.source_label
    ) || coalesce(bs.source_detail, '{}'::jsonb),
    '{}'::jsonb
  ),
  bs.created_at,
  bs.updated_at
from public.bookmark_sources bs
on conflict (user_id, account_id) do update
set
  saved_source = coalesce(public.user_bookmarks.saved_source, excluded.saved_source),
  saved_source_detail = case
    when public.user_bookmarks.saved_source_detail = '{}'::jsonb then excluded.saved_source_detail
    else public.user_bookmarks.saved_source_detail || excluded.saved_source_detail
  end,
  updated_at = greatest(public.user_bookmarks.updated_at, excluded.updated_at);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_folder_items'
      and column_name = 'user_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_folder_items'
      and column_name = 'account_id'
  ) then
    insert into public.user_bookmarks (
      user_id,
      account_id
    )
    select distinct
      bfi.user_id,
      bfi.account_id
    from public.bookmark_folder_items bfi
    on conflict (user_id, account_id) do nothing;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_tag_items'
      and column_name = 'user_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_tag_items'
      and column_name = 'account_id'
  ) then
    insert into public.user_bookmarks (
      user_id,
      account_id
    )
    select distinct
      bti.user_id,
      bti.account_id
    from public.bookmark_tag_items bti
    on conflict (user_id, account_id) do nothing;
  end if;
end
$$;

alter table public.bookmark_folder_items
  add column if not exists bookmark_id bigint;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_folder_items'
      and column_name = 'user_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_folder_items'
      and column_name = 'account_id'
  ) then
    update public.bookmark_folder_items bfi
    set bookmark_id = ub.id
    from public.user_bookmarks ub
    where
      bfi.bookmark_id is null
      and bfi.user_id = ub.user_id
      and bfi.account_id = ub.account_id;
  end if;
end
$$;

alter table public.bookmark_folder_items
  drop constraint if exists bookmark_folder_items_folder_id_account_id_key,
  drop constraint if exists bookmark_folder_items_bookmark_id_fkey;

delete from public.bookmark_folder_items
where bookmark_id is null;

alter table public.bookmark_folder_items
  alter column bookmark_id set not null;

alter table public.bookmark_folder_items
  add constraint bookmark_folder_items_bookmark_id_fkey
  foreign key (bookmark_id) references public.user_bookmarks(id) on delete cascade;

drop index if exists public.bookmark_folder_items_user_account_idx;

create unique index if not exists bookmark_folder_items_folder_bookmark_idx
  on public.bookmark_folder_items (folder_id, bookmark_id);

create index if not exists bookmark_folder_items_bookmark_idx
  on public.bookmark_folder_items (bookmark_id);

alter table public.bookmark_folder_items
  drop column if exists user_id,
  drop column if exists account_id;

alter table public.bookmark_tag_items
  add column if not exists bookmark_id bigint;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_tag_items'
      and column_name = 'user_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookmark_tag_items'
      and column_name = 'account_id'
  ) then
    update public.bookmark_tag_items bti
    set bookmark_id = ub.id
    from public.user_bookmarks ub
    where
      bti.bookmark_id is null
      and bti.user_id = ub.user_id
      and bti.account_id = ub.account_id;
  end if;
end
$$;

alter table public.bookmark_tag_items
  drop constraint if exists bookmark_tag_items_tag_id_account_id_key,
  drop constraint if exists bookmark_tag_items_bookmark_id_fkey;

delete from public.bookmark_tag_items
where bookmark_id is null;

alter table public.bookmark_tag_items
  alter column bookmark_id set not null;

alter table public.bookmark_tag_items
  add constraint bookmark_tag_items_bookmark_id_fkey
  foreign key (bookmark_id) references public.user_bookmarks(id) on delete cascade;

drop index if exists public.bookmark_tag_items_user_account_idx;

create unique index if not exists bookmark_tag_items_tag_bookmark_idx
  on public.bookmark_tag_items (tag_id, bookmark_id);

create index if not exists bookmark_tag_items_bookmark_idx
  on public.bookmark_tag_items (bookmark_id);

alter table public.bookmark_tag_items
  drop column if exists user_id,
  drop column if exists account_id;

create index if not exists user_bookmarks_user_created_idx
  on public.user_bookmarks (user_id, created_at desc);

create index if not exists user_bookmarks_account_idx
  on public.user_bookmarks (account_id);
