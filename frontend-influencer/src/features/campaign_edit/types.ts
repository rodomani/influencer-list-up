export type Campaign = {
  id: number | string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  goal: string | null;
  influencers?: string | null;
  internal_memo?: string | null;
  status?: string | null;
};

export type CampaignEditFormValues = {
  name: string;
  description: string;
  budget: string;
  goal: string;
  internal_memo: string;
};

export type CampaignUpdatePayload = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  goal: string;
  internal_memo: string;
};
