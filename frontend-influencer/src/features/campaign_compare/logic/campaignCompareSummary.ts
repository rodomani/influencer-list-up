import {
  latestCampaignInfluencerMetric,
} from "@/features/campaign_detail/logic/campaignInfluencerFormatters";
import type { Campaign } from "@/features/campaign/types";
import type { CampaignInfluencer } from "@/features/campaign_detail/types";
import type { CampaignCompareSummary } from "../types";

const positiveMetric = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? value : 0;

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const durationDays = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
};

export const buildCampaignCompareSummary = (
  campaign: Campaign,
  influencers: CampaignInfluencer[]
): CampaignCompareSummary => {
  const metrics = influencers.map((influencer) =>
    latestCampaignInfluencerMetric(influencer.account?.accounts_metrics)
  );
  const candidateCount = influencers.length;
  const confirmedCount = influencers.filter((influencer) => influencer.status === "confirmed").length;
  const totalFollowers = metrics.reduce((sum, metric) => sum + positiveMetric(metric?.followers), 0);
  const totalPosts = metrics.reduce((sum, metric) => sum + positiveMetric(metric?.posts), 0);
  const totalMaxLikes = metrics.reduce((sum, metric) => sum + positiveMetric(metric?.maximum_likes), 0);
  const assignedCost = influencers.reduce((sum, influencer) => sum + (influencer.quoted_price ?? 0), 0);
  const budget = typeof campaign.budget === "number" ? campaign.budget : null;
  const budgetUtilizationRate = budget !== null && budget > 0 ? assignedCost / budget : null;
  const confirmationRate = candidateCount > 0 ? confirmedCount / candidateCount : 0;
  const deliverableDueCount = influencers.filter((influencer) => Boolean(influencer.deliverable_due_date)).length;
  const postedDeliverableCount = influencers.filter((influencer) => influencer.deliverable_status === "posted").length;
  const deliverableCompletionRate =
    deliverableDueCount > 0 ? postedDeliverableCount / deliverableDueCount : 0;
  const costPerConfirmedInfluencer =
    assignedCost > 0 && confirmedCount > 0 ? assignedCost / confirmedCount : null;
  const costPerMaxLike = assignedCost > 0 && totalMaxLikes > 0 ? assignedCost / totalMaxLikes : null;
  const budgetHealthScore =
    budget === null || budget <= 0
      ? 45
      : clamp(100 - Math.max(0, (budgetUtilizationRate ?? 0) - 1) * 160);
  const audienceScore = clamp(Math.log10(totalFollowers + 1) * 12);
  const engagementScore = clamp((totalFollowers > 0 ? totalMaxLikes / totalFollowers : 0) * 600);
  const readinessScore = Math.round(
    clamp(
      confirmationRate * 36 +
        deliverableCompletionRate * 24 +
        (candidateCount > 0 ? 16 : 0) +
        (budget !== null ? 12 : 0) +
        (campaign.start_date && campaign.end_date ? 12 : 0)
    )
  );
  const efficiencyScore = Math.round(
    clamp(
      budgetHealthScore * 0.42 +
        audienceScore * 0.25 +
        engagementScore * 0.2 +
        (assignedCost > 0 && totalFollowers > 0 ? 13 : 0)
    )
  );
  const comparisonScore = Math.round(clamp(readinessScore * 0.48 + efficiencyScore * 0.52));
  const scoreReasons = [
    candidateCount > 0 ? `候補者${candidateCount}人` : "候補者が未設定",
    confirmedCount > 0 ? `採用確定${confirmedCount}人` : "採用確定が未設定",
    totalFollowers > 0 ? `想定リーチ${totalFollowers.toLocaleString("ja-JP")}` : "フォロワー指標が不足",
    budgetUtilizationRate !== null
      ? `予算使用率${(budgetUtilizationRate * 100).toFixed(1)}%`
      : "予算が未設定",
  ];

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
    assignedCost,
    remainingBudget: budget === null ? null : budget - assignedCost,
    budgetPerInfluencer: budget !== null && candidateCount > 0 ? budget / candidateCount : null,
    budgetPerFollower: budget !== null && totalFollowers > 0 ? budget / totalFollowers : null,
    costPerConfirmedInfluencer,
    costPerMaxLike,
    durationDays: durationDays(campaign.start_date, campaign.end_date),
    budgetUtilizationRate,
    confirmationRate,
    deliverableDueCount,
    postedDeliverableCount,
    deliverableCompletionRate,
    readinessScore,
    efficiencyScore,
    comparisonScore,
    scoreReasons,
  };
};
