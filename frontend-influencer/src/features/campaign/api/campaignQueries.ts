import { supabase } from "@/lib/supabase";
import type { CampaignStatusValue } from "../logic/campaignStatus";
import type { Campaign } from "../types";

const CAMPAIGN_SELECT = `
  id,
  user_id,
  name,
  description,
  start_date,
  end_date,
  budget,
  goal,
  status,
  influencers,
  internal_memo,
  created_at,
  updated_at
`;

export const fetchCampaigns = async (userId: string) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Campaign[]) ?? [];
};

export const updateCampaignStatus = async ({
  campaignId,
  userId,
  status,
}: {
  campaignId: number | string;
  userId: string;
  status: CampaignStatusValue;
}) => {
  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) throw error;
};
