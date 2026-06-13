create table if not exists public.campaign_influencers (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  status text not null default 'selected',
  notes text,
  quoted_price numeric,
  deliverables text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, account_id)
);

create index if not exists campaign_influencers_campaign_idx
  on public.campaign_influencers (campaign_id);

create index if not exists campaign_influencers_account_idx
  on public.campaign_influencers (account_id);

create index if not exists campaign_influencers_status_idx
  on public.campaign_influencers (status);
