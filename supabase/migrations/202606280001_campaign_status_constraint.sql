alter table public.campaigns
  drop constraint if exists campaigns_status_check;

alter table public.campaigns
  add constraint campaigns_status_check
  check (
    status is null
    or status in ('draft', 'ongoing', 'complete', 'paused', 'needs_review')
  ) not valid;
