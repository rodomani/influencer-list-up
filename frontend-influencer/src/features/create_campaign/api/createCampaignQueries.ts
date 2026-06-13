import { supabase } from "@/lib/supabase";
import type { CreateCampaignPayload } from "../types";

export const createCampaign = async (payload: CreateCampaignPayload) => {
  const { error } = await supabase.from("campaigns").insert(payload);
  if (error) throw error;
};
