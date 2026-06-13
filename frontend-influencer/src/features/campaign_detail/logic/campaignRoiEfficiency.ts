import type {
  Campaign,
  CampaignInfluencer,
  CampaignRoiEfficiency,
} from "../types";
import { latestCampaignInfluencerMetric } from "./campaignInfluencerFormatters";

const positiveNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const ratioScore = (value: number | null, excellent: number, weak: number) => {
  if (value === null || value <= 0) return 0;
  if (value <= excellent) return 100;
  if (value >= weak) return 15;
  return Math.round(100 - ((value - excellent) / (weak - excellent)) * 85);
};

export const buildCampaignRoiEfficiency = (
  campaign: Campaign | undefined,
  influencers: CampaignInfluencer[]
): CampaignRoiEfficiency => {
  const budget = typeof campaign?.budget === "number" ? campaign.budget : null;
  const assignedCost = influencers.reduce(
    (sum, influencer) => sum + positiveNumber(influencer.quoted_price),
    0
  );
  const pricedInfluencerCount = influencers.filter(
    (influencer) => positiveNumber(influencer.quoted_price) > 0
  ).length;
  const effectiveCost = assignedCost > 0 ? assignedCost : budget;
  const metrics = influencers.map((influencer) =>
    latestCampaignInfluencerMetric(influencer.account?.accounts_metrics)
  );
  const totalFollowers = metrics.reduce((sum, metric) => sum + positiveNumber(metric?.followers), 0);
  const totalPosts = metrics.reduce((sum, metric) => sum + positiveNumber(metric?.posts), 0);
  const totalMaxLikes = metrics.reduce((sum, metric) => sum + positiveNumber(metric?.maximum_likes), 0);
  const candidateCount = influencers.length;
  const costPerFollower = effectiveCost && totalFollowers > 0 ? effectiveCost / totalFollowers : null;
  const costPerPost = effectiveCost && totalPosts > 0 ? effectiveCost / totalPosts : null;
  const costPerMaxLike = effectiveCost && totalMaxLikes > 0 ? effectiveCost / totalMaxLikes : null;
  const costPerInfluencer = effectiveCost && candidateCount > 0 ? effectiveCost / candidateCount : null;
  const budgetUtilization = budget && budget > 0 && assignedCost > 0 ? assignedCost / budget : null;
  const dataCompletenessScore =
    candidateCount === 0 ? 0 : Math.round((pricedInfluencerCount / candidateCount) * 100);

  const efficiencyInputs = [
    ratioScore(costPerFollower, 0.02, 0.25),
    ratioScore(costPerMaxLike, 0.5, 8),
    ratioScore(costPerPost, 500, 10000),
    budgetUtilization === null
      ? 45
      : budgetUtilization <= 1
      ? Math.round(100 - Math.abs(0.85 - budgetUtilization) * 45)
      : Math.max(0, Math.round(65 - (budgetUtilization - 1) * 100)),
    dataCompletenessScore,
  ];

  return {
    effectiveCost,
    budget,
    totalFollowers,
    totalPosts,
    totalMaxLikes,
    candidateCount,
    pricedInfluencerCount,
    costPerFollower,
    costPerPost,
    costPerMaxLike,
    costPerInfluencer,
    budgetUtilization,
    efficiencyScore:
      efficiencyInputs.length > 0
        ? Math.round(efficiencyInputs.reduce((sum, value) => sum + value, 0) / efficiencyInputs.length)
        : 0,
    dataCompletenessScore,
    overBudget: budget !== null && assignedCost > budget,
  };
};

export const formatRoiNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", { maximumFractionDigits: value < 10 ? 2 : 0 }).format(value)
    : "未設定";

export const formatRoiPercent = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value)
    : "未設定";
