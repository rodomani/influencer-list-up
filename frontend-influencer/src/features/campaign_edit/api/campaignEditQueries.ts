import { supabase } from "@/lib/supabase";
import type { CampaignUpdatePayload } from "../types";

export const updateCampaign = async ({
  campaignId,
  userId,
  payload,
}: {
  campaignId: number | string;
  userId: string;
  payload: CampaignUpdatePayload;
}) => {
  const { error } = await supabase
    .from("campaigns")
    .update(payload)
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) throw error;
};
