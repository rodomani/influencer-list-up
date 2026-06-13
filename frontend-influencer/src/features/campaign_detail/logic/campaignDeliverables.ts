import type { CampaignInfluencer } from "../types";

export const CAMPAIGN_DELIVERABLE_STATUS_OPTIONS = [
  { value: "not_started", label: "未着手" },
  { value: "brief_sent", label: "依頼済み" },
  { value: "in_progress", label: "制作中" },
  { value: "submitted", label: "提出済み" },
  { value: "approved", label: "承認済み" },
  { value: "posted", label: "公開済み" },
];

export const campaignDeliverableStatusLabel = (value: string | null | undefined) =>
  CAMPAIGN_DELIVERABLE_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? "未着手";

export const campaignDeliverableProgress = (influencers: CampaignInfluencer[]) => {
  if (influencers.length === 0) return 0;
  const completed = influencers.filter(
    (influencer) => influencer.deliverable_status === "posted"
  ).length;
  return Math.round((completed / influencers.length) * 100);
};

export const campaignDeliverableSummary = (influencers: CampaignInfluencer[]) => ({
  total: influencers.length,
  planned: influencers.filter((influencer) => Boolean(influencer.deliverables?.trim())).length,
  dueDates: influencers.filter((influencer) => Boolean(influencer.deliverable_due_date)).length,
  posted: influencers.filter((influencer) => influencer.deliverable_status === "posted").length,
});
