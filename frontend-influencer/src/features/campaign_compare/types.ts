import type {
  CampaignInfluencer,
  CampaignInfluencerAccount,
} from "@/features/campaign_detail/types";
import type { Campaign } from "@/features/campaign/types";

export type CampaignCompareMetric = {
  label: string;
  values: Array<string | number | null>;
  numeric?: boolean;
  date?: boolean;
  higherIsBetter?: boolean;
  format?: (value: string | number | null) => string;
};

export type CampaignCompareSummary = {
  candidateCount: number;
  confirmedCount: number;
  totalFollowers: number;
  totalPosts: number;
  totalMaxLikes: number;
  averageFollowers: number;
  averageMaxLikes: number;
  engagementProxyRate: number;
  budget: number | null;
  assignedCost: number;
  remainingBudget: number | null;
  budgetPerInfluencer: number | null;
  budgetPerFollower: number | null;
  costPerConfirmedInfluencer: number | null;
  costPerMaxLike: number | null;
  durationDays: number | null;
  budgetUtilizationRate: number | null;
  confirmationRate: number;
  deliverableDueCount: number;
  postedDeliverableCount: number;
  deliverableCompletionRate: number;
  readinessScore: number;
  efficiencyScore: number;
  comparisonScore: number;
  scoreReasons: string[];
};

export type CampaignCompareRecommendation = {
  row: CampaignCompareRow;
  score: number;
  reasons: string[];
};

export type CampaignCompareRow = {
  campaign: Campaign;
  influencers: CampaignInfluencer[];
  summary: CampaignCompareSummary;
};

export type CampaignCompareRelationRow = Omit<CampaignInfluencer, "account"> & {
  sns_accounts?: CampaignInfluencerAccount | CampaignInfluencerAccount[] | null;
};
