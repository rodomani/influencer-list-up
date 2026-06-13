alter table public.influencer_growth_anomaly_summary
add column if not exists analysis_status text;

alter table public.influencer_growth_anomaly_summary
add column if not exists latest_metric_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'influencer_growth_anomaly_summary_analysis_status_check'
  ) then
    alter table public.influencer_growth_anomaly_summary
    add constraint influencer_growth_anomaly_summary_analysis_status_check
    check (
      analysis_status is null
      or analysis_status in ('ok', 'no_metrics', 'stale_source_data', 'insufficient_history')
    );
  end if;
end $$;

create table if not exists public.analysis_job_runs (
  id bigint generated always as identity primary key,
  analysis_name text not null,
  account_id bigint,
  platform text,
  status text not null,
  rows_written integer,
  error_message text,
  details jsonb,
  analysis_version text,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists analysis_job_runs_analysis_name_idx
  on public.analysis_job_runs (analysis_name);

create index if not exists analysis_job_runs_account_idx
  on public.analysis_job_runs (account_id);

create index if not exists analysis_job_runs_platform_idx
  on public.analysis_job_runs (platform);

create index if not exists analysis_job_runs_finished_at_idx
  on public.analysis_job_runs (finished_at desc);
