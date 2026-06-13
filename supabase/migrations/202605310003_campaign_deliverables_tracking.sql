alter table public.campaign_influencers
add column if not exists deliverable_status text not null default 'not_started',
add column if not exists deliverable_due_date date;

create index if not exists campaign_influencers_deliverable_status_idx
  on public.campaign_influencers (deliverable_status);
