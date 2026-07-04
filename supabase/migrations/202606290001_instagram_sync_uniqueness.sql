create unique index if not exists sns_accounts_platform_platform_profile_id_key
  on public.sns_accounts (platform, platform_profile_id)
  where platform_profile_id is not null;

create unique index if not exists accounts_metrics_account_metric_date_key
  on public.accounts_metrics (account_id, metric_date);
