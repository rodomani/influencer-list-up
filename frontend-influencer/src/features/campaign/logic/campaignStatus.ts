export const CAMPAIGN_STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "ongoing", label: "進行中" },
  { value: "complete", label: "完了" },
  { value: "paused", label: "停止中" },
  { value: "needs_review", label: "要確認" },
] as const;

export type CampaignStatusValue = (typeof CAMPAIGN_STATUS_OPTIONS)[number]["value"];

export const isCampaignStatusValue = (
  value: string | null | undefined
): value is CampaignStatusValue =>
  CAMPAIGN_STATUS_OPTIONS.some((option) => option.value === value);

export const campaignStatusLabel = (status: string | null | undefined) =>
  CAMPAIGN_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "下書き";
