import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/features/campaign/types";
import type { CampaignInfluencerAccount } from "@/features/campaign_detail/types";
import type { CampaignCompareRelationRow, CampaignCompareRow } from "../types";
import { buildCampaignCompareSummary } from "../logic/campaignCompareSummary";

const normalizeAccount = (
  value: CampaignCompareRelationRow["sns_accounts"]
): CampaignInfluencerAccount | null => {
  const account = Array.isArray(value) ? value[0] ?? null : value ?? null;
  if (!account?.accounts_metrics) return account;

  return {
    ...account,
    accounts_metrics: [...account.accounts_metrics].sort((a, b) => {
      const aTime = a.metric_date ? new Date(a.metric_date).getTime() : 0;
      const bTime = b.metric_date ? new Date(b.metric_date).getTime() : 0;
      return bTime - aTime;
    }),
  };
};

const readableSupabaseError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    return [
      typeof maybeError.message === "string" ? maybeError.message : null,
      typeof maybeError.details === "string" ? maybeError.details : null,
      typeof maybeError.hint === "string" ? maybeError.hint : null,
      typeof maybeError.code === "string" ? `code: ${maybeError.code}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return "不明なエラーが発生しました。";
};

const isMissingCampaignInfluencersTable = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "PGRST205" &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes("campaign_influencers")
  );
};

export const fetchCampaignsForCompare = async ({
  ids,
  userId,
}: {
  ids: string[];
  userId: string;
}): Promise<CampaignCompareRow[]> => {
  const { data: campaignData, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids);

  if (campaignError) throw new Error(readableSupabaseError(campaignError));

  const campaigns = ((campaignData as Campaign[]) ?? []).sort(
    (a, b) => ids.indexOf(String(a.id)) - ids.indexOf(String(b.id))
  );

  if (campaigns.length === 0) return [];

  const { data: relationData, error: relationError } = await supabase
    .from("campaign_influencers")
    .select(
      `
      id,
      campaign_id,
      account_id,
      status,
      notes,
      quoted_price,
      deliverables,
      deliverable_status,
      deliverable_due_date,
      added_at,
      sns_accounts(
        id,
        platform,
        account_name,
        profile_image_url,
        gender,
        keywords,
        accounts_metrics(maximum_likes, posts, followers, metric_date)
      )
    `
    )
    .in("campaign_id", campaigns.map((campaign) => campaign.id));

  if (relationError) {
    if (isMissingCampaignInfluencersTable(relationError)) {
      return campaigns.map((campaign) => ({
        campaign,
        influencers: [],
        summary: buildCampaignCompareSummary(campaign, []),
      }));
    }

    throw new Error(readableSupabaseError(relationError));
  }

  const relations = ((relationData as CampaignCompareRelationRow[]) ?? []).map((row) => ({
    ...row,
    account: normalizeAccount(row.sns_accounts),
  }));

  return campaigns.map((campaign) => {
    const influencers = relations.filter((relation) => relation.campaign_id === campaign.id);
    return {
      campaign,
      influencers,
      summary: buildCampaignCompareSummary(campaign, influencers),
    };
  });
};
