import type { DateRange } from "react-day-picker";
import type { CreateCampaignFormValues, CreateCampaignPayload } from "../types";

export const initialCreateCampaignFormValues = (): CreateCampaignFormValues => ({
  name: "",
  description: "",
  budget: "",
  goal: "",
  internal_memo: "",
  status: "ongoing",
});

export const initialCreateCampaignDateRange = (): DateRange => {
  const from = new Date();
  const to = new Date();
  to.setDate(from.getDate() + 7);
  return { from, to };
};

export const formatDateForCreate = (date: Date) => date.toISOString().split("T")[0];

export const buildCreateCampaignPayload = ({
  formValues,
  dateRange,
  userId,
}: {
  formValues: CreateCampaignFormValues;
  dateRange: DateRange;
  userId: string;
}): CreateCampaignPayload => ({
  user_id: userId,
  name: formValues.name,
  description: formValues.description,
  start_date: formatDateForCreate(dateRange.from as Date),
  end_date: formatDateForCreate(dateRange.to as Date),
  budget: formValues.budget ? Number(formValues.budget) : null,
  goal: formValues.goal,
  internal_memo: formValues.internal_memo,
  status: formValues.status,
});
