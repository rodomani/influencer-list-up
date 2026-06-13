export type MetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

export type InfluencerCompareRow = {
  id: number;
  platform: string;
  account_name: string;
  account_url: string | null;
  profile_image_url: string | null;
  gender: string | null;
  keywords: string | null;
  last_profile_scraped_at: string | null;
  accounts_metrics?: MetricsRow[] | null;
  latest_posted_at?: string | null;
  latest_activity_at?: string | null;
  latest_post_link?: string | null;
};

export type ComparisonMetric = {
  label: string;
  values: Array<string | number | null | undefined>;
  format?: (value: string | number | null | undefined) => string;
  numeric?: boolean;
  date?: boolean;
};

export type PostActivityRow = {
  account_id: number;
  posted_at: string | null;
  scraped_at: string | null;
  link: string | null;
};

export type FreshnessState = {
  label: string;
  age: string;
  className: string;
};
