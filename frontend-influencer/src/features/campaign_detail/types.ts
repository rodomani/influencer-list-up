export type Campaign = {
  id: number | string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  goal: string | null;
  influencers: string | null;
  internal_memo?: string | null;
  status: string | null;
  created_at?: string | null;
};

export type CampaignInfluencerStatus =
  | "selected"
  | "contacting"
  | "confirmed"
  | "on_hold"
  | "declined";

export type CampaignInfluencerMetric = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

export type CampaignInfluencerAccount = {
  id: number;
  platform: string;
  account_name: string;
  profile_image_url: string | null;
  gender: string | null;
  keywords: string | null;
  accounts_metrics?: CampaignInfluencerMetric[] | null;
};

export type CampaignRecommendedInfluencer = CampaignInfluencerAccount & {
  recommendationScore: number;
  recommendationReasons: string[];
  latestMetric: CampaignInfluencerMetric | null;
};

export type CampaignTask = {
  id: number;
  campaign_id: number | string;
  title: string;
  completed: boolean;
  position: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CampaignInfluencer = {
  id: number;
  campaign_id: number | string;
  account_id: number;
  status: CampaignInfluencerStatus | string;
  notes: string | null;
  quoted_price: number | null;
  deliverables: string | null;
  deliverable_status?: string | null;
  deliverable_due_date?: string | null;
  added_at: string | null;
  account: CampaignInfluencerAccount | null;
};

export type CampaignInfluencerSummary = {
  count: number;
  totalFollowers: number;
  totalPosts: number;
  averageMaxLikes: number;
};

export type CampaignPerformanceSummary = {
  candidateCount: number;
  confirmedCount: number;
  totalFollowers: number;
  totalPosts: number;
  totalMaxLikes: number;
  averageFollowers: number;
  averageMaxLikes: number;
  engagementProxyRate: number;
  budget: number | null;
  budgetPerInfluencer: number | null;
  budgetPerFollower: number | null;
  projectedReach: number;
};

export type CampaignBudgetAllocation = {
  budget: number | null;
  assignedCost: number;
  remainingBudget: number | null;
  averageCostPerInfluencer: number | null;
  allocationRate: number | null;
  pricedInfluencerCount: number;
  unpricedInfluencerCount: number;
  overBudget: boolean;
};

export type CampaignRoiEfficiency = {
  effectiveCost: number | null;
  budget: number | null;
  totalFollowers: number;
  totalPosts: number;
  totalMaxLikes: number;
  candidateCount: number;
  pricedInfluencerCount: number;
  costPerFollower: number | null;
  costPerPost: number | null;
  costPerMaxLike: number | null;
  costPerInfluencer: number | null;
  budgetUtilization: number | null;
  efficiencyScore: number;
  dataCompletenessScore: number;
  overBudget: boolean;
};

export type CampaignCalendarEventType =
  | "campaign"
  | "review"
  | "influencer"
  | "deliverable"
  | "task"
  | "custom";

export type CampaignCalendarEvent = {
  id: string;
  date: string;
  label: string;
  description: string;
  type: CampaignCalendarEventType;
};

export type CampaignCustomCalendarEvent = {
  id: number;
  campaign_id: number | string;
  title: string;
  event_date: string;
  event_type: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CampaignCalendarMonth = {
  key: string;
  label: string;
  days: Array<{
    key: string;
    dayNumber: number;
    date: string;
    inMonth: boolean;
    events: CampaignCalendarEvent[];
  }>;
};

export type CampaignTimelineItem = {
  key: string;
  label: string;
  date: string | null;
  description: string;
  status: "done" | "current" | "upcoming" | "missing";
};
