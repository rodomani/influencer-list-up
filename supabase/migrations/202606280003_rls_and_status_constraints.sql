alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_influencers enable row level security;
alter table public.campaign_tasks enable row level security;
alter table public.campaign_calendar_events enable row level security;
alter table public.user_bookmarks enable row level security;
alter table public.bookmark_folders enable row level security;
alter table public.bookmark_folder_items enable row level security;
alter table public.bookmark_tags enable row level security;
alter table public.bookmark_tag_items enable row level security;

drop policy if exists "Users can manage their own profile" on public.users;
create policy "Users can manage their own profile"
on public.users
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage their own campaigns" on public.campaigns;
create policy "Users can manage their own campaigns"
on public.campaigns
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage campaign influencers via owned campaigns" on public.campaign_influencers;
create policy "Users can manage campaign influencers via owned campaigns"
on public.campaign_influencers
for all
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_influencers.campaign_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_influencers.campaign_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage campaign tasks via owned campaigns" on public.campaign_tasks;
create policy "Users can manage campaign tasks via owned campaigns"
on public.campaign_tasks
for all
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_tasks.campaign_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_tasks.campaign_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage campaign calendar events via owned campaigns" on public.campaign_calendar_events;
create policy "Users can manage campaign calendar events via owned campaigns"
on public.campaign_calendar_events
for all
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_calendar_events.campaign_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_calendar_events.campaign_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage their own bookmarks" on public.user_bookmarks;
create policy "Users can manage their own bookmarks"
on public.user_bookmarks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own bookmark folders" on public.bookmark_folders;
create policy "Users can manage their own bookmark folders"
on public.bookmark_folders
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage bookmark folder items via owned bookmarks" on public.bookmark_folder_items;
create policy "Users can manage bookmark folder items via owned bookmarks"
on public.bookmark_folder_items
for all
using (
  exists (
    select 1
    from public.bookmark_folders bf
    join public.user_bookmarks ub on ub.id = bookmark_folder_items.bookmark_id
    where bf.id = bookmark_folder_items.folder_id
      and bf.user_id = auth.uid()
      and ub.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.bookmark_folders bf
    join public.user_bookmarks ub on ub.id = bookmark_folder_items.bookmark_id
    where bf.id = bookmark_folder_items.folder_id
      and bf.user_id = auth.uid()
      and ub.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage their own bookmark tags" on public.bookmark_tags;
create policy "Users can manage their own bookmark tags"
on public.bookmark_tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage bookmark tag items via owned bookmarks" on public.bookmark_tag_items;
create policy "Users can manage bookmark tag items via owned bookmarks"
on public.bookmark_tag_items
for all
using (
  exists (
    select 1
    from public.bookmark_tags bt
    join public.user_bookmarks ub on ub.id = bookmark_tag_items.bookmark_id
    where bt.id = bookmark_tag_items.tag_id
      and bt.user_id = auth.uid()
      and ub.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.bookmark_tags bt
    join public.user_bookmarks ub on ub.id = bookmark_tag_items.bookmark_id
    where bt.id = bookmark_tag_items.tag_id
      and bt.user_id = auth.uid()
      and ub.user_id = auth.uid()
  )
);

alter table public.campaign_influencers
  drop constraint if exists campaign_influencers_status_check;

alter table public.campaign_influencers
  add constraint campaign_influencers_status_check
  check (
    status in ('selected', 'contacting', 'confirmed', 'on_hold', 'declined')
  ) not valid;

alter table public.campaign_influencers
  drop constraint if exists campaign_influencers_deliverable_status_check;

alter table public.campaign_influencers
  add constraint campaign_influencers_deliverable_status_check
  check (
    deliverable_status in ('not_started', 'brief_sent', 'in_progress', 'submitted', 'approved', 'posted')
  ) not valid;

alter table public.analysis_job_runs
  drop constraint if exists analysis_job_runs_status_check;

alter table public.analysis_job_runs
  add constraint analysis_job_runs_status_check
  check (
    status in ('queued', 'running', 'completed', 'failed', 'skipped')
  ) not valid;

alter table public.user_bookmarks
  drop constraint if exists user_bookmarks_candidate_readiness_check;

alter table public.user_bookmarks
  add constraint user_bookmarks_candidate_readiness_check
  check (
    candidate_readiness is null
    or candidate_readiness in ('未確認', '調査中', '候補', '連絡候補', '除外候補')
  ) not valid;
