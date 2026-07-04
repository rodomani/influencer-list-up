create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  company text,
  role text,
  timezone text not null default 'Asia/Seoul',
  language text not null default 'ja',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_verified boolean not null default false
);

create table if not exists public.campaigns (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  description text,
  start_date date,
  end_date date,
  budget numeric,
  goal text,
  status text default 'draft',
  influencers text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_user_created_idx
  on public.campaigns (user_id, created_at desc);

create table if not exists public.sns_accounts (
  id bigint generated always as identity primary key,
  profile_id text,
  platform text not null,
  country text,
  email text,
  language text,
  gender text,
  caption text,
  account_url text not null,
  account_name text not null,
  is_verified boolean,
  profile_image_url text,
  business_account boolean,
  does_livestream boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  keywords text,
  platform_user_id text,
  platform_profile_id text,
  last_profile_scraped_at timestamptz,
  last_posts_scraped_at timestamptz
);

create index if not exists sns_accounts_platform_name_idx
  on public.sns_accounts (platform, account_name);

create table if not exists public.accounts_metrics (
  id bigint generated always as identity primary key,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  posts bigint,
  followers bigint,
  following bigint,
  profile_views bigint,
  metric_date date not null,
  videos bigint,
  created_at timestamptz not null default now(),
  maximum_likes bigint
);

create index if not exists accounts_metrics_account_metric_date_idx
  on public.accounts_metrics (account_id, metric_date desc);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  account_id bigint references public.sns_accounts(id) on delete cascade,
  media_type text,
  content_text text,
  link text,
  posted_at timestamptz,
  scraped_at timestamptz,
  caption text,
  campaign_id bigint,
  collaboration_id bigint,
  external_post_id text
);

create index if not exists posts_account_posted_at_idx
  on public.posts (account_id, posted_at desc);

create table if not exists public.influencer_average_comment_analysis (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  avg_sentiment numeric,
  avg_toxicity numeric,
  avg_emotion jsonb,
  avg_language jsonb,
  avg_topics jsonb,
  avg_conversion_intent_rate numeric,
  updated_at timestamptz not null default now(),
  account_id bigint references public.sns_accounts(id) on delete cascade,
  posts_count integer,
  avg_spam_rate numeric,
  sum_sampled_total integer,
  window text,
  avg_hate_score numeric,
  sum_filtered_total integer
);

create index if not exists influencer_average_comment_analysis_account_window_idx
  on public.influencer_average_comment_analysis (account_id, window);

create table if not exists public.influencer_growth_anomaly_summary (
  id bigint generated always as identity primary key,
  account_id bigint not null references public.sns_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists influencer_growth_anomaly_summary_account_idx
  on public.influencer_growth_anomaly_summary (account_id);
