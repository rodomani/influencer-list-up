export type Filters = {
  platforms: string[];
  username?: string;
  gender?: string;
  keywords?: string[];
  likes?: number[];
  posts?: number[];
  followers?: number[];
  campaignId?: string;
};

export type MetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

export type InfluencerRowFromDB = {
  id: number;
  platform: string;
  account_name: string;
  gender: string | null;
  keywords: string | null;
  profile_image_url: string | null;
  accounts_metrics?: MetricsRow[] | null;
  bookmarks: string[] | null;
};

export type InfluencerNormalized = {
  id: number;
  platform: string;
  account_name: string;
  profile_image_url?: string | null;
  gender: string | null;
  keywords: string | null;
  accounts_metrics: MetricsRow | null;
  bookmarks: string[];
  latest_posted_at?: string | null;
  latest_activity_at?: string | null;
  first_posted_at?: string | null;
  posting_span_days?: number;
};

export type PostActivityRow = {
  account_id: number;
  posted_at: string | null;
  scraped_at: string | null;
};

export type CampaignOption = {
  id: string;
  name: string;
  influencers: string | null;
};

export type CampaignTargetInfluencer = {
  id: number;
  account_name: string;
};

export type SortOption =
  | "recommended"
  | "followers_desc"
  | "followers_asc"
  | "posts_desc"
  | "posts_asc"
  | "likes_desc"
  | "likes_asc"
  | "engagement_rate_desc"
  | "posting_frequency_desc"
  | "latest_post_desc"
  | "latest_post_asc"
  | "latest_activity_desc"
  | "metric_date_desc"
  | "posting_span_desc"
  | "posting_span_asc"
  | "bookmarks_desc"
  | "keyword_count_desc"
  | "name_asc";

export type FreshnessState = {
  label: string;
  age: string;
  className: string;
};
