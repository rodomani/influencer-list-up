import { supabase } from "@/lib/supabase";
import { readableSupabaseError, type SupabaseErrorLike } from "@/lib/supabaseErrors";
import type {
  CampaignOption,
  Filters,
  InfluencerNormalized,
  MetricsRow,
  SortOption,
} from "../types";

type SearchInfluencerRpcRow = {
  id: number;
  platform: string;
  account_name: string;
  gender: string | null;
  keywords: string | null;
  profile_image_url: string | null;
  followers: number | null;
  posts: number | null;
  maximum_likes: number | null;
  metric_date: string | null;
  latest_posted_at: string | null;
  latest_activity_at: string | null;
  posting_span_days: number | null;
  bookmark_count: number | null;
  total_count: number | null;
};

type BookmarkSourcePayload = {
  userId: string;
  accountId: number;
  sourceType: string;
  sourceLabel: string;
  sourceDetail: Record<string, unknown>;
};

type BookmarkSourceInput = Omit<BookmarkSourcePayload, "userId" | "accountId">;

type BookmarkMutationPayload = {
  userId: string;
  accountId: number;
  source?: BookmarkSourceInput | null;
};

const throwUserBookmarksError = (error: SupabaseErrorLike) => {
  const message = readableSupabaseError(error);

  if (error.code === "PGRST205") {
    throw new Error(
      `PostgRESTが user_bookmarks テーブルを認識していません。Supabase SQL Editorで "NOTIFY pgrst, 'reload schema';" を実行してください。詳細: ${message}`
    );
  }

  if (error.code === "PGRST204") {
    throw new Error(
      `user_bookmarks のカラムがPostgRESTに認識されていません。saved_source / saved_source_detail が存在するか確認し、schema cacheをreloadしてください。詳細: ${message}`
    );
  }

  throw new Error(message);
};

const normalizeInfluencerRows = (
  rows: SearchInfluencerRpcRow[]
): InfluencerNormalized[] =>
  rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    account_name: row.account_name,
    gender: row.gender,
    keywords: row.keywords,
    profile_image_url: row.profile_image_url,
    accounts_metrics: {
      maximum_likes: row.maximum_likes,
      posts: row.posts,
      followers: row.followers,
      metric_date: row.metric_date,
    } as MetricsRow,
    latest_posted_at: row.latest_posted_at,
    latest_activity_at: row.latest_activity_at,
    posting_span_days: row.posting_span_days ?? undefined,
    bookmark_count: row.bookmark_count ?? 0,
    hasUserBookmark: false,
    bookmarkId: undefined,
  }));

const attachUserBookmarkState = async (
  influencers: InfluencerNormalized[],
  userId?: string
): Promise<InfluencerNormalized[]> => {
  if (!userId || influencers.length === 0) {
    return influencers.map((influencer) => ({
      ...influencer,
      hasUserBookmark: false,
    }));
  }

  const accountIds = influencers.map((influencer) => influencer.id);

  const { data, error } = await supabase
    .from("user_bookmarks")
    .select("id, account_id")
    .eq("user_id", userId)
    .in("account_id", accountIds);

  if (error) {
    throwUserBookmarksError(error);
  }

  const bookmarkIdByAccountId = new Map(
    (data ?? []).map((row) => [Number(row.account_id), Number(row.id)])
  );

  return influencers.map((influencer) => ({
    ...influencer,
    hasUserBookmark: bookmarkIdByAccountId.has(influencer.id),
    bookmarkId: bookmarkIdByAccountId.get(influencer.id),
  }));
};

export type SearchInfluencersParams = {
  platforms: string[];
  username?: string;
  keywords?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  minLikes?: number;
  maxLikes?: number;
  minPosts?: number;
  maxPosts?: number;
  sort: SortOption;
  page: number;
  pageSize: number;
};

export type SearchInfluencersResult = {
  influencers: InfluencerNormalized[];
  totalCount: number;
};

export const searchInfluencers = async (
  params: SearchInfluencersParams,
  userId?: string
): Promise<SearchInfluencersResult> => {
  const { data, error } = await supabase.rpc("search_influencers", {
    p_platforms: params.platforms,
    p_username: params.username?.trim() || null,
    p_keywords: params.keywords?.length ? params.keywords : null,
    p_min_followers: params.minFollowers ?? null,
    p_max_followers: params.maxFollowers ?? null,
    p_min_likes: params.minLikes ?? null,
    p_max_likes: params.maxLikes ?? null,
    p_min_posts: params.minPosts ?? null,
    p_max_posts: params.maxPosts ?? null,
    p_sort: params.sort,
    p_limit: params.pageSize,
    p_offset: Math.max(0, (params.page - 1) * params.pageSize),
  });

  if (error) {
    throw new Error(readableSupabaseError(error));
  }

  const rows = (data as SearchInfluencerRpcRow[] | null) ?? [];
  const totalCount = rows[0]?.total_count ?? 0;
  const normalized = normalizeInfluencerRows(rows);

  return {
    influencers: await attachUserBookmarkState(normalized, userId),
    totalCount,
  };
};

export const fetchCampaignOptions = async (userId: string) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(readableSupabaseError(error));
  }

  return (data as CampaignOption[]) ?? [];
};

export const fetchSearchResults = async (
  filters: Filters,
  userId: string | undefined,
  sort: SortOption,
  page: number,
  pageSize: number
): Promise<SearchInfluencersResult> => {
  const [likeMin, likeMax] = filters.likes ?? [0, 10_000_000];
  const [postMin, postMax] = filters.posts ?? [0, 10_000_000];
  const [followerMin, followerMax] = filters.followers ?? [0, 10_000_000];

  return searchInfluencers(
    {
      platforms: filters.platforms,
      username: filters.username,
      keywords: filters.keywords,
      minFollowers: followerMin,
      maxFollowers: followerMax,
      minLikes: likeMin,
      maxLikes: likeMax,
      minPosts: postMin,
      maxPosts: postMax,
      sort,
      page,
      pageSize,
    },
    userId
  );
};

export const updateCampaignInfluencers = async ({
  campaignId,
  accountId,
}: {
  campaignId: string;
  accountId: number;
}) => {
  const { error: relationError } = await supabase
    .from("campaign_influencers")
    .upsert(
      {
        campaign_id: campaignId,
        account_id: accountId,
        status: "selected",
      },
      { onConflict: "campaign_id,account_id" }
    );

  if (relationError) {
    throw new Error(readableSupabaseError(relationError));
  }
};

export const addUserBookmark = async ({
  userId,
  accountId,
  source,
}: BookmarkMutationPayload) => {
  const { data, error } = await supabase
    .from("user_bookmarks")
    .upsert(
      {
        user_id: userId,
        account_id: accountId,
        saved_source: source?.sourceType ?? "search_results",
        saved_source_detail: source
          ? {
              sourceType: source.sourceType,
              sourceLabel: source.sourceLabel,
              sourceDetail: source.sourceDetail,
            }
          : {
              sourceType: "search_results",
              sourceLabel: "検索結果",
              sourceDetail: {},
            },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,account_id",
      }
    )
    .select("id")
    .single();

  if (error) {
    throwUserBookmarksError(error);
  }

  if (!data) {
    throw new Error("user_bookmarks row was not returned after upsert.");
  }

  return Number(data.id);
};

export const removeUserBookmark = async ({
  userId,
  accountId,
}: BookmarkMutationPayload) => {
  const { error } = await supabase
    .from("user_bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("account_id", accountId);

  if (error) {
    throwUserBookmarksError(error);
  }
};

export const saveBookmarkSource = async ({
  userId,
  accountId,
  sourceType,
  sourceLabel,
  sourceDetail,
}: BookmarkSourcePayload) => {
  const { error } = await supabase
    .from("user_bookmarks")
    .upsert(
      {
        user_id: userId,
        account_id: accountId,
        saved_source: sourceType,
        saved_source_detail: {
          sourceType,
          sourceLabel,
          sourceDetail,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,account_id",
      }
    );

  if (error) {
    throwUserBookmarksError(error);
  }
};
