export type MetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

export type InfluencerDetail = {
  id: number;
  platform: string;
  account_name: string;
  account_url: string | null;
  caption: string | null;
  profile_image_url: string | null;
  gender: string | null;
  keywords: string | null;
  accounts_metrics?: MetricsRow[] | null;
  last_profile_scraped_at: string | null;
};

export type InfluencerAverageCommentAnalysis = {
  account_id: number;
  window: string;
  posts_count: number | null;
  avg_sentiment: number | null;
  avg_toxicity: number | null;
  avg_hate_score: number | null;
  avg_conversion_intent_rate: number | null;
  avg_spam_rate: number | null;
  sum_sampled_total: number | null;
  sum_filtered_total: number | null;
  avg_emotion: Record<string, number> | null;
  avg_language: Record<string, number> | null;
  avg_topics: Record<string, number> | null;
  updated_at: string | null;
};

export type PostActivityRow = {
  posted_at: string | null;
  scraped_at: string | null;
};

export type AccountMetricTrendRow = {
  metric_date: string | null;
  followers: number | null;
  posts: number | null;
  maximum_likes: number | null;
};

export type AccountMetricTrendPoint = {
  date: string;
  followers: number;
  posts: number;
  maximum_likes: number;
};

export type PostActivityTrendPoint = {
  date: string;
  posts: number;
};

export type TrendData = {
  accountMetricTrend: AccountMetricTrendPoint[];
  postingActivityTrend: PostActivityTrendPoint[];
};

export type PostActivitySummary = {
  latest_posted_at: string | null;
  latest_activity_at: string | null;
  first_posted_at: string | null;
  posting_span_days: number;
};

export type ScoreBreakdown = {
  label: string;
  value: number;
  weight: number;
};

export type SimilarInfluencerRow = {
  id: number;
  platform: string;
  keywords: string | null;
  accounts_metrics?: MetricsRow[] | null;
};

export type SimilarBenchmarkMetric = {
  label: string;
  currentValue: number;
  percentile: number;
  topPercent: number;
  rank: number;
  sampleSize: number;
};

export type SimilarBenchmark = {
  sampleSize: number;
  overallTopPercent: number;
  metrics: SimilarBenchmarkMetric[];
};

export type RiskItem = {
  label: string;
  level: "低" | "中" | "高" | "不明";
  description: string;
};

export type RiskSummary = {
  level: "低リスク" | "中リスク" | "高リスク";
  score: number;
  message: string;
  className: string;
  barClassName: string;
  items: RiskItem[];
};

export type RefreshJobStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export type RefreshJobRun = {
  id: number;
  status: RefreshJobStatus | string;
  rows_written: number | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

export type RefreshFailureMonitoring = {
  category?: string;
  user_message?: string;
  retryable?: boolean;
  provider_run_id?: string | null;
  provider_status?: string | null;
  provider_error_type?: string | null;
};
