import type {
  CampaignInfluencer,
  CampaignInfluencerMetric,
  CampaignInfluencerSummary,
  CampaignInfluencerStatus,
} from "../types";

export const CAMPAIGN_INFLUENCER_STATUS_OPTIONS: Array<{
  value: CampaignInfluencerStatus;
  label: string;
}> = [
  { value: "selected", label: "候補" },
  { value: "contacting", label: "連絡中" },
  { value: "confirmed", label: "採用" },
  { value: "on_hold", label: "保留" },
  { value: "declined", label: "辞退" },
];

export const campaignInfluencerStatusLabel = (status: string | null | undefined) =>
  CAMPAIGN_INFLUENCER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "候補";

export const formatInfluencerMetric = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("ja-JP").format(value) : "未設定";

export const latestCampaignInfluencerMetric = (
  metrics: CampaignInfluencerMetric[] | null | undefined
) => (Array.isArray(metrics) && metrics.length > 0 ? metrics[0] : null);

export const splitCampaignInfluencerKeywords = (value: string | null | undefined) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : [];

export const buildCampaignInfluencerSummary = (
  influencers: CampaignInfluencer[]
): CampaignInfluencerSummary => {
  const metrics = influencers.map((influencer) =>
    latestCampaignInfluencerMetric(influencer.account?.accounts_metrics)
  );
  const maxLikes = metrics
    .map((metric) => metric?.maximum_likes)
    .filter((value): value is number => typeof value === "number" && value > 0);

  return {
    count: influencers.length,
    totalFollowers: metrics.reduce((sum, metric) => sum + (metric?.followers ?? 0), 0),
    totalPosts: metrics.reduce((sum, metric) => sum + (metric?.posts ?? 0), 0),
    averageMaxLikes:
      maxLikes.length > 0
        ? Math.round(maxLikes.reduce((sum, value) => sum + value, 0) / maxLikes.length)
        : 0,
  };
};
