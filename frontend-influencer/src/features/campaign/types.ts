import type { CampaignStatusValue } from "./logic/campaignStatus";

export type Campaign = {
  id: number | string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  goal: string | null;
  influencers?: string | null;
  internal_memo?: string | null;
  status: CampaignStatusValue | string | null;
};

export type CampaignDashboardSummary = {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalBudget: number;
  endingSoonCampaigns: number;
  campaignsWithoutInfluencers: number;
};
