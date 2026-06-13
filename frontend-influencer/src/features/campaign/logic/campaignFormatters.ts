import type { Campaign, CampaignDashboardSummary } from "../types";
import { campaignStatusLabel } from "./campaignStatus";

export const formatCampaignValue = (value: string | number | null | undefined) =>
  value == null || value === "" ? "未設定" : String(value);

export const formatCampaignBudget = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("ja-JP").format(value) : "未設定";

export const formatCampaignPeriod = (campaign: Campaign) =>
  `${formatCampaignValue(campaign.start_date)} – ${formatCampaignValue(campaign.end_date)}`;

export const formatCampaignStatus = campaignStatusLabel;

export const splitCampaignsByStatus = (campaigns: Campaign[]) => ({
  activeCampaigns: campaigns.filter((campaign) => campaign.status !== "complete"),
  completedCampaigns: campaigns.filter((campaign) => campaign.status === "complete"),
});

const dateToTime = (value: string | null | undefined) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value.includes("T") ? value : `${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

export const buildCampaignDashboardSummary = (
  campaigns: Campaign[],
  now = new Date()
): CampaignDashboardSummary => {
  const nowTime = now.getTime();
  const soonTime = nowTime + 14 * 86_400_000;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== "complete");

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    completedCampaigns: campaigns.length - activeCampaigns.length,
    totalBudget: campaigns.reduce((sum, campaign) => sum + (campaign.budget ?? 0), 0),
    endingSoonCampaigns: activeCampaigns.filter((campaign) => {
      const endTime = dateToTime(campaign.end_date);
      return endTime >= nowTime && endTime <= soonTime;
    }).length,
    campaignsWithoutInfluencers: campaigns.filter(
      (campaign) => !campaign.influencers || campaign.influencers.trim().length === 0
    ).length,
  };
};
