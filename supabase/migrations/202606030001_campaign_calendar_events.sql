create table if not exists public.campaign_calendar_events (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_type text not null default 'custom',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_calendar_events_campaign_date_idx
  on public.campaign_calendar_events (campaign_id, event_date);
