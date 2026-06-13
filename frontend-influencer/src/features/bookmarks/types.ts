export type BookmarkMetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

export type BookmarkedInfluencerRowFromDB = {
  id: number;
  platform: string;
  account_name: string;
  gender: string | null;
  keywords: string | null;
  profile_image_url: string | null;
  accounts_metrics?: BookmarkMetricsRow[] | null;
  last_profile_scraped_at: string | null;
  hasUserBookmark: boolean;
};

export type BookmarkPriorityValue = "high" | "medium" | "low";
export type BookmarkReadinessValue =
  | "未確認"
  | "調査中"
  | "候補"
  | "連絡候補"
  | "除外候補";
export type BookmarkRiskLevelValue = "low" | "medium" | "high" | "unknown";

export type BookmarkResearchChecklist = {
  profile_checked: boolean;
  latest_posts_checked: boolean;
  comments_checked: boolean;
  risk_checked: boolean;
  price_checked: boolean;
  contact_checked: boolean;
  audience_fit_checked: boolean;
  brand_fit_checked: boolean;
};

export type BookmarkContactInfo = {
  email: string;
  agency: string;
  dmUrl: string;
  preferredMethod: string;
  lastContactedAt: string;
  responseSpeed: string;
  contactPerson: string;
  phone: string;
  nextFollowUpAt: string;
  notes: string;
};

export type BookmarkSavedSnapshot = {
  followers: number | null;
  posts: number | null;
  maximumLikes: number | null;
  metricDate: string;
  savedAt: string;
};

export const DEFAULT_BOOKMARK_CONTACT_INFO: BookmarkContactInfo = {
  email: "",
  agency: "",
  dmUrl: "",
  preferredMethod: "",
  lastContactedAt: "",
  responseSpeed: "",
  contactPerson: "",
  phone: "",
  nextFollowUpAt: "",
  notes: "",
};

export const DEFAULT_BOOKMARK_RESEARCH_CHECKLIST: BookmarkResearchChecklist = {
  profile_checked: false,
  latest_posts_checked: false,
  comments_checked: false,
  risk_checked: false,
  price_checked: false,
  contact_checked: false,
  audience_fit_checked: false,
  brand_fit_checked: false,
};

export type BookmarkedInfluencer = {
  id: number;
  platform: string;
  account_name: string;
  profile_image_url?: string | null;
  gender: string | null;
  keywords: string | null;
  accounts_metrics: BookmarkMetricsRow | null;
  last_profile_scraped_at: string | null;
  hasUserBookmark: boolean;
  latest_posted_at?: string | null;
  latest_activity_at?: string | null;
  folderIds: number[];
  tagIds: number[];
  priority: BookmarkPriorityValue | null;
  candidateReadiness: BookmarkReadinessValue;
  riskLevel: BookmarkRiskLevelValue;
  riskNotes: string;
  priceMemory: BookmarkPriceMemory;
  contactInfo: BookmarkContactInfo;
  savedSnapshot: BookmarkSavedSnapshot | null;
  researchChecklist: BookmarkResearchChecklist;
  whySavedMemo: string;
  savedSource: BookmarkSavedSource | null;
  personalRating: BookmarkRatingValue | null;
};

export type BookmarkPostActivityRow = {
  account_id: number;
  posted_at: string | null;
  scraped_at: string | null;
};

export type BookmarkWatchlistAlertSeverity = "high" | "medium" | "info";

export type BookmarkWatchlistAlert = {
  id: string;
  label: string;
  description: string;
  severity: BookmarkWatchlistAlertSeverity;
};

export type BookmarkFolder = {
  id: number;
  user_id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkFolderItem = {
  id: number;
  folder_id: number;
  user_id: string;
  account_id: number;
  created_at?: string | null;
};

export type BookmarkTag = {
  id: number;
  user_id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkTagItem = {
  id: number;
  tag_id: number;
  user_id: string;
  account_id: number;
  created_at?: string | null;
};

export type BookmarkPriority = {
  id: number;
  user_id: string;
  account_id: number;
  priority: BookmarkPriorityValue;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkReadiness = {
  id: number;
  user_id: string;
  account_id: number;
  readiness: BookmarkReadinessValue;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkRiskProfile = {
  id: number;
  user_id: string;
  account_id: number;
  risk_level: BookmarkRiskLevelValue;
  risk_notes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkPriceMemory = {
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  price_note: string;
  price_checked_at: string | null;
};

export type BookmarkMemo = {
  id: number;
  user_id: string;
  account_id: number;
  memo: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkSavedSource = {
  id: number;
  user_id: string;
  account_id: number;
  source_type: string;
  source_label: string;
  source_detail: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BookmarkRatingValue = 1 | 2 | 3 | 4 | 5;
