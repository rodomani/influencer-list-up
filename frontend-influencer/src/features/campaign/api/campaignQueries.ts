import { supabase } from "@/lib/supabase";
import type { Campaign } from "../types";

export const fetchCampaigns = async (userId: string) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
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
  status: string;
}) => {
  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) throw error;
};
