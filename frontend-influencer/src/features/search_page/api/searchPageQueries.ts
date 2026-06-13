import { supabase } from "@/lib/supabase";
import type { CampaignOption, KeywordRow } from "../types";
import { normalizeKeywordOptions } from "../logic/searchPageFormatters";

export const fetchSearchCampaigns = async (userId: string) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as CampaignOption[]) ?? [];
};

export const fetchSearchKeywordOptions = async () => {
  const { data, error } = await supabase
    .from("sns_accounts")
    .select("keywords")
    .not("keywords", "is", null);

  if (error) throw error;
  return normalizeKeywordOptions((data as KeywordRow[]) ?? []);
};
