export type CreateCampaignFormValues = {
  name: string;
  description: string;
  budget: string;
  goal: string;
  internal_memo: string;
  status: string;
};

export type CreateCampaignPayload = {
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  goal: string;
  internal_memo: string;
  status: string;
};
