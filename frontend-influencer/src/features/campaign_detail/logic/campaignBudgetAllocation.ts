import type {
  Campaign,
  CampaignBudgetAllocation,
  CampaignInfluencer,
} from "../types";

const positiveNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

export const buildCampaignBudgetAllocation = (
  campaign: Campaign | undefined,
  influencers: CampaignInfluencer[]
): CampaignBudgetAllocation => {
  const budget = typeof campaign?.budget === "number" ? campaign.budget : null;
  const pricedInfluencers = influencers.filter((influencer) => positiveNumber(influencer.quoted_price) > 0);
  const assignedCost = influencers.reduce(
    (sum, influencer) => sum + positiveNumber(influencer.quoted_price),
    0
  );
  const remainingBudget = budget === null ? null : budget - assignedCost;

  return {
    budget,
    assignedCost,
    remainingBudget,
    averageCostPerInfluencer:
      pricedInfluencers.length > 0 ? assignedCost / pricedInfluencers.length : null,
    allocationRate: budget && budget > 0 ? assignedCost / budget : null,
    pricedInfluencerCount: pricedInfluencers.length,
    unpricedInfluencerCount: influencers.length - pricedInfluencers.length,
    overBudget: remainingBudget !== null && remainingBudget < 0,
  };
};

export const formatBudgetNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", { maximumFractionDigits: value < 10 ? 2 : 0 }).format(value)
    : "未設定";

export const formatBudgetPercent = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("ja-JP", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value)
    : "未設定";
