create table if not exists public.campaign_tasks (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, title)
);

create index if not exists campaign_tasks_campaign_idx
  on public.campaign_tasks (campaign_id, position);
