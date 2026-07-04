import { supabase } from "@/lib/supabase";
import {
  isMissingSchemaObjectError,
  readableSupabaseError,
  type SupabaseErrorLike,
} from "@/lib/supabaseErrors";
import type { CampaignInfluencer, CampaignInfluencerAccount } from "../types";

type CampaignInfluencerRelationRow = Omit<CampaignInfluencer, "account"> & {
  sns_accounts?: Omit<CampaignInfluencerAccount, "accounts_metrics"> |
    Array<Omit<CampaignInfluencerAccount, "accounts_metrics">> |
    null;
};

type LatestAccountMetricRow = {
  account_id: number | null;
  followers: number | null;
  posts: number | null;
  maximum_likes: number | null;
  metric_date: string | null;
};

type RecommendInfluencersRpcRow = {
  id: number;
  platform: string;
  account_name: string;
  profile_image_url: string | null;
  gender: string | null;
  keywords: string | null;
  followers: number | null;
  posts: number | null;
  maximum_likes: number | null;
  metric_date: string | null;
  recommendation_score: number | null;
  recommendation_reasons: unknown;
};

const normalizeAccount = ({
  value,
  latestMetricByAccountId,
}: {
  value: CampaignInfluencerRelationRow["sns_accounts"];
  latestMetricByAccountId: Map<number, LatestAccountMetricRow>;
}): CampaignInfluencerAccount | null => {
  const account = Array.isArray(value) ? value[0] ?? null : value ?? null;
  if (!account) return null;

  return {
    ...account,
    accounts_metrics:
      typeof account.id === "number" && latestMetricByAccountId.has(account.id)
        ? [latestMetricByAccountId.get(account.id)!]
        : [],
  };
};

const isMissingCampaignInfluencersTable = (error: unknown) => {
  return isMissingSchemaObjectError(
    (error ?? {}) as SupabaseErrorLike,
    ["campaign_influencers"]
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
        keywords
      )
    `
    )
    .eq("campaign_id", campaignId)
    .order("added_at", { ascending: false });

  if (error) {
    if (isMissingCampaignInfluencersTable(error)) return [];
    throw new Error(readableSupabaseError(error));
  }

  const rows = (data as CampaignInfluencerRelationRow[]) ?? [];
  const accountIds = rows
    .map((row) => {
      const account = Array.isArray(row.sns_accounts) ? row.sns_accounts[0] : row.sns_accounts;
      return typeof account?.id === "number" ? account.id : null;
    })
    .filter((accountId): accountId is number => accountId !== null);

  const latestMetricByAccountId = new Map<number, LatestAccountMetricRow>();
  if (accountIds.length > 0) {
    const { data: latestMetrics, error: latestMetricsError } = await supabase
      .from("latest_account_metrics")
      .select("account_id, followers, posts, maximum_likes, metric_date")
      .in("account_id", accountIds);

    if (latestMetricsError) {
      throw new Error(readableSupabaseError(latestMetricsError));
    }

    ((latestMetrics as LatestAccountMetricRow[] | null) ?? []).forEach((metric) => {
      if (typeof metric.account_id === "number") {
        latestMetricByAccountId.set(metric.account_id, metric);
      }
    });
  }

  return rows.map((row) => ({
    ...row,
    account: normalizeAccount({
      value: row.sns_accounts,
      latestMetricByAccountId,
    }),
  }));
};

export const recommendInfluencersForCampaign = async ({
  campaignId,
  goal,
  budget,
  excludedAccountIds,
  limit = 6,
}: {
  campaignId: number | string;
  goal?: string | null;
  budget?: number | null;
  excludedAccountIds: number[];
  limit?: number;
}) => {
  const { data, error } = await supabase.rpc("recommend_influencers_for_campaign", {
    p_campaign_id: Number(campaignId),
    p_goal: goal?.trim() || null,
    p_budget: budget ?? null,
    p_excluded_account_ids: excludedAccountIds.length ? excludedAccountIds : null,
    p_limit: limit,
  });

  if (error) throw new Error(readableSupabaseError(error));

  return ((data as RecommendInfluencersRpcRow[] | null) ?? []).map((row) => ({
    id: row.id,
    platform: row.platform,
    account_name: row.account_name,
    profile_image_url: row.profile_image_url,
    gender: row.gender,
    keywords: row.keywords,
    accounts_metrics: [
      {
        followers: row.followers,
        posts: row.posts,
        maximum_likes: row.maximum_likes,
        metric_date: row.metric_date,
      },
    ],
    latestMetric: {
      followers: row.followers,
      posts: row.posts,
      maximum_likes: row.maximum_likes,
      metric_date: row.metric_date,
    },
    recommendationScore: row.recommendation_score ?? 0,
    recommendationReasons: Array.isArray(row.recommendation_reasons)
      ? row.recommendation_reasons.filter(
          (reason): reason is string => typeof reason === "string" && reason.length > 0
        )
      : [],
  }));
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

const assertCampaignOwnership = async ({
  campaignId,
  userId,
}: {
  campaignId: number | string;
  userId: string;
}) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(readableSupabaseError(error));
  if (!data) throw new Error("このキャンペーンを更新する権限がありません。");
};

export const updateCampaignInfluencerStatus = async ({
  relationId,
  campaignId,
  userId,
  status,
}: {
  relationId: number;
  campaignId: number | string;
  userId: string;
  status: string;
}) => {
  await assertCampaignOwnership({ campaignId, userId });

  const { error } = await supabase
    .from("campaign_influencers")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(readableSupabaseError(error));
};

export const updateCampaignInfluencerQuotedPrice = async ({
  relationId,
  campaignId,
  userId,
  quotedPrice,
}: {
  relationId: number;
  campaignId: number | string;
  userId: string;
  quotedPrice: number | null;
}) => {
  if (quotedPrice !== null && quotedPrice < 0) {
    throw new Error("見積金額は0以上で入力してください。");
  }

  await assertCampaignOwnership({ campaignId, userId });

  const { error } = await supabase
    .from("campaign_influencers")
    .update({
      quoted_price: quotedPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(readableSupabaseError(error));
};

export const updateCampaignInfluencerDeliverables = async ({
  relationId,
  campaignId,
  userId,
  deliverables,
  deliverableStatus,
  deliverableDueDate,
}: {
  relationId: number;
  campaignId: number | string;
  userId: string;
  deliverables: string;
  deliverableStatus: string;
  deliverableDueDate: string | null;
}) => {
  await assertCampaignOwnership({ campaignId, userId });

  const { error } = await supabase
    .from("campaign_influencers")
    .update({
      deliverables,
      deliverable_status: deliverableStatus,
      deliverable_due_date: deliverableDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(readableSupabaseError(error));
};

export const removeCampaignInfluencer = async ({
  relationId,
  campaignId,
  userId,
}: {
  relationId: number;
  campaignId: number | string;
  userId: string;
}) => {
  await assertCampaignOwnership({ campaignId, userId });

  const { error } = await supabase
    .from("campaign_influencers")
    .delete()
    .eq("id", relationId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(readableSupabaseError(error));
};
