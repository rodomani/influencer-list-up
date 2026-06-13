import { supabase } from "@/lib/supabase";
import type { CampaignInfluencer, CampaignInfluencerAccount } from "../types";

type CampaignInfluencerRelationRow = Omit<CampaignInfluencer, "account"> & {
  sns_accounts?: CampaignInfluencerAccount | CampaignInfluencerAccount[] | null;
};

const normalizeAccount = (
  value: CampaignInfluencerRelationRow["sns_accounts"]
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

export const fetchCampaignInfluencers = async (campaignId: number | string) => {
  const { data, error } = await supabase
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
    .eq("campaign_id", campaignId)
    .order("added_at", { ascending: false });

  if (error) {
    if (isMissingCampaignInfluencersTable(error)) return [];
    throw new Error(readableSupabaseError(error));
  }

  return ((data as CampaignInfluencerRelationRow[]) ?? []).map((row) => ({
    ...row,
    account: normalizeAccount(row.sns_accounts),
  }));
};

export const fetchRecommendationCandidateAccounts = async () => {
  const { data, error } = await supabase
    .from("sns_accounts")
    .select(
      `
      id,
      platform,
      account_name,
      profile_image_url,
      gender,
      keywords,
      accounts_metrics(maximum_likes, posts, followers, metric_date)
    `
    )
    .limit(120)
    .order("metric_date", { foreignTable: "accounts_metrics", ascending: false });

  if (error) throw new Error(readableSupabaseError(error));
  return ((data as CampaignInfluencerAccount[]) ?? []).filter((account) => account.account_name);
};

export const addCampaignInfluencerRelation = async ({
  campaignId,
  accountId,
}: {
  campaignId: number | string;
  accountId: number;
}) => {
  const { error } = await supabase
    .from("campaign_influencers")
    .upsert(
      {
        campaign_id: campaignId,
        account_id: accountId,
        status: "selected",
      },
      { onConflict: "campaign_id,account_id" }
    );

  if (error) throw new Error(readableSupabaseError(error));
};

export const updateCampaignInfluencerStatus = async ({
  relationId,
  status,
}: {
  relationId: number;
  status: string;
}) => {
  const { error } = await supabase
    .from("campaign_influencers")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationId);

  if (error) throw new Error(readableSupabaseError(error));
};

export const updateCampaignInfluencerQuotedPrice = async ({
  relationId,
  quotedPrice,
}: {
  relationId: number;
  quotedPrice: number | null;
}) => {
  const { error } = await supabase
    .from("campaign_influencers")
    .update({
      quoted_price: quotedPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationId);

  if (error) throw new Error(readableSupabaseError(error));
};

export const updateCampaignInfluencerDeliverables = async ({
  relationId,
  deliverables,
  deliverableStatus,
  deliverableDueDate,
}: {
  relationId: number;
  deliverables: string;
  deliverableStatus: string;
  deliverableDueDate: string | null;
}) => {
  const { error } = await supabase
    .from("campaign_influencers")
    .update({
      deliverables,
      deliverable_status: deliverableStatus,
      deliverable_due_date: deliverableDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationId);

  if (error) throw new Error(readableSupabaseError(error));
};

export const removeCampaignInfluencer = async (relationId: number) => {
  const { error } = await supabase
    .from("campaign_influencers")
    .delete()
    .eq("id", relationId);

  if (error) throw new Error(readableSupabaseError(error));
};
