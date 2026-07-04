alter table public.analysis_job_runs
  alter column finished_at drop not null,
  alter column finished_at drop default;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_users on public.users;
create trigger set_updated_at_on_users
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_campaigns on public.campaigns;
create trigger set_updated_at_on_campaigns
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_sns_accounts on public.sns_accounts;
create trigger set_updated_at_on_sns_accounts
before update on public.sns_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_campaign_influencers on public.campaign_influencers;
create trigger set_updated_at_on_campaign_influencers
before update on public.campaign_influencers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_campaign_tasks on public.campaign_tasks;
create trigger set_updated_at_on_campaign_tasks
before update on public.campaign_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_campaign_calendar_events on public.campaign_calendar_events;
create trigger set_updated_at_on_campaign_calendar_events
before update on public.campaign_calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_bookmark_folders on public.bookmark_folders;
create trigger set_updated_at_on_bookmark_folders
before update on public.bookmark_folders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_bookmark_tags on public.bookmark_tags;
create trigger set_updated_at_on_bookmark_tags
before update on public.bookmark_tags
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_user_bookmarks on public.user_bookmarks;
create trigger set_updated_at_on_user_bookmarks
before update on public.user_bookmarks
for each row execute function public.set_updated_at();
