create or replace view public.bookmarked_accounts_for_refresh as
select
  ub.user_id,
  ub.account_id,
  ub.created_at as bookmarked_at,
  sa.*
from public.user_bookmarks ub
join public.sns_accounts sa on sa.id = ub.account_id;


create or replace function public.claim_single_influencer_refresh_jobs(job_limit integer default 10)
returns setof public.analysis_job_runs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with locked_jobs as (
    select ajr.id
    from public.analysis_job_runs ajr
    where ajr.analysis_name = 'single_influencer_refresh'
      and ajr.status = 'queued'
    order by ajr.created_at asc
    limit greatest(job_limit, 0)
    for update skip locked
  ),
  claimed_jobs as (
    update public.analysis_job_runs ajr
    set
      status = 'running',
      started_at = now(),
      error_message = null,
      finished_at = null
    from locked_jobs
    where ajr.id = locked_jobs.id
    returning ajr.*
  )
  select *
  from claimed_jobs
  order by created_at asc;
end;
$$;

grant select on public.bookmarked_accounts_for_refresh to authenticated, service_role;
grant execute on function public.claim_single_influencer_refresh_jobs(integer) to service_role;
