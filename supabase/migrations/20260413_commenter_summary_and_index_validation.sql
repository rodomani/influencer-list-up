create or replace view public.analysis_unique_indexes as
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and lower(indexdef) like 'create unique index%';

create table if not exists public.influencer_commenter_quality_summary (
  id bigint generated always as identity primary key,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  platform text not null,
  window_label text not null,
  avg_unique_commenters double precision,
  avg_comments_per_commenter double precision,
  avg_repeat_commenter_rate double precision,
  avg_substantive_comment_rate double precision,
  avg_question_rate double precision,
  avg_low_signal_comment_rate double precision,
  avg_suspicious_commenter_rate double precision,
  posts_used integer not null default 0,
  analysis_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists influencer_commenter_quality_summary_account_window_version_idx
  on public.influencer_commenter_quality_summary (account_id, window_label, analysis_version);

create index if not exists influencer_commenter_quality_summary_account_idx
  on public.influencer_commenter_quality_summary (account_id);

create index if not exists influencer_commenter_quality_summary_platform_idx
  on public.influencer_commenter_quality_summary (platform);

create unique index if not exists account_growth_anomaly_events_account_metric_date_version_idx
  on public.account_growth_anomaly_events (account_id, metric_date, analysis_version);

create unique index if not exists influencer_growth_anomaly_summary_account_window_version_idx
  on public.influencer_growth_anomaly_summary (account_id, window_label, analysis_version);

create unique index if not exists post_commenter_quality_analysis_post_version_idx
  on public.post_commenter_quality_analysis (post_id, analysis_version);

create unique index if not exists post_sponsorship_analysis_post_version_idx
  on public.post_sponsorship_analysis (post_id, analysis_version);

create unique index if not exists influencer_performance_summary_account_window_idx
  on public.influencer_performance_summary (account_id, "window");
