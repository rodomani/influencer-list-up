export const formatCampaignValue = (value: string | number | null | undefined) =>
  value == null || value === "" ? "未設定" : String(value);

export const formatCampaignBudget = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("ja-JP").format(value) : "未設定";

export const formatCampaignPeriod = (
  startDate: string | null | undefined,
  endDate: string | null | undefined
) => `${formatCampaignValue(startDate)} – ${formatCampaignValue(endDate)}`;
