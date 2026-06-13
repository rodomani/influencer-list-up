import type { DateRange } from "react-day-picker";
import type { Campaign, CampaignEditFormValues, CampaignUpdatePayload } from "../types";

export const initialCampaignFormValues = (
  campaign: Campaign | undefined
): CampaignEditFormValues => ({
  name: campaign?.name ?? "",
  description: campaign?.description ?? "",
  budget: campaign?.budget?.toString() ?? "",
  goal: campaign?.goal ?? "",
  internal_memo: campaign?.internal_memo ?? "",
});

export const initialCampaignDateRange = (
  campaign: Campaign | undefined
): DateRange | undefined => {
  if (campaign?.start_date && campaign?.end_date) {
    return {
      from: new Date(campaign.start_date),
      to: new Date(campaign.end_date),
    };
  }
  return undefined;
};

export const formatDateForUpdate = (date: Date) => date.toISOString().split("T")[0];

export const buildCampaignUpdatePayload = (
  formValues: CampaignEditFormValues,
  dateRange: DateRange
): CampaignUpdatePayload => ({
  name: formValues.name,
  description: formValues.description,
  start_date: formatDateForUpdate(dateRange.from as Date),
  end_date: formatDateForUpdate(dateRange.to as Date),
  budget: formValues.budget ? Number(formValues.budget) : null,
  goal: formValues.goal,
  internal_memo: formValues.internal_memo,
});
