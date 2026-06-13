import type {
  Campaign,
  CampaignInfluencer,
  CampaignPerformanceSummary,
} from "../types";
import { latestCampaignInfluencerMetric } from "./campaignInfluencerFormatters";

const positiveNumber = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? value : 0;

export const buildCampaignPerformanceSummary = (
  campaign: Campaign | undefined,
  influencers: CampaignInfluencer[]
): CampaignPerformanceSummary => {
  const metrics = influencers.map((influencer) =>
    latestCampaignInfluencerMetric(influencer.account?.accounts_metrics)
  );
  const totalFollowers = metrics.reduce((sum, metric) => sum + positiveNumber(metric?.followers), 0);
  const totalPosts = metrics.reduce((sum, metric) => sum + positiveNumber(metric?.posts), 0);
  const totalMaxLikes = metrics.reduce((sum, metric) => sum + positiveNumber(metric?.maximum_likes), 0);
  const candidateCount = influencers.length;
  const confirmedCount = influencers.filter((influencer) => influencer.status === "confirmed").length;
  const budget = typeof campaign?.budget === "number" ? campaign.budget : null;

  return {
    candidateCount,
    confirmedCount,
    totalFollowers,
    totalPosts,
    totalMaxLikes,
    averageFollowers: candidateCount > 0 ? Math.round(totalFollowers / candidateCount) : 0,
    averageMaxLikes: candidateCount > 0 ? Math.round(totalMaxLikes / candidateCount) : 0,
    engagementProxyRate: totalFollowers > 0 ? totalMaxLikes / totalFollowers : 0,
    budget,
    budgetPerInfluencer: budget !== null && candidateCount > 0 ? budget / candidateCount : null,
    budgetPerFollower: budget !== null && totalFollowers > 0 ? budget / totalFollowers : null,
    projectedReach: totalFollowers,
  };
};

export const formatPerformanceNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(value)
    : "未設定";

export const formatPerformanceCurrency = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", {
        maximumFractionDigits: value < 10 ? 2 : 0,
      }).format(value)
    : "未設定";

export const formatPerformancePercent = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(value)
    : "未設定";
