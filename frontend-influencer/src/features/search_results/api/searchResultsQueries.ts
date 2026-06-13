import { supabase } from "@/lib/supabase";
import type {
  CampaignOption,
  Filters,
  InfluencerNormalized,
  InfluencerRowFromDB,
  MetricsRow,
  PostActivityRow,
} from "../types";
import { daysBetween, timestampToMs } from "../logic/formatters";

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

type SearchInfluencerRowFromDB = Omit<InfluencerRowFromDB, "bookmarks"> & {
  bookmarks?: string[] | null;
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

const readableSupabaseError = (error: SupabaseErrorLike | null | undefined) => {
  if (!error) return "Supabase request failed.";

  const message = [
    error.message,
    error.details,
    error.hint,
    error.code ? `code: ${error.code}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return message || "Supabase request failed.";
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

const pickLatest = (metrics: MetricsRow[] | null | undefined): MetricsRow | null =>
  Array.isArray(metrics) && metrics.length > 0 ? metrics[0] : null;

const normalizeMetric = (value: number | null | undefined) => {
  if (value == null) return 0;
  if (value < 0) return 0;
  return value;
};

const within = (value: number, min: number, max: number) => value >= min && value <= max;

const normalizeInfluencerRows = (
  rows: SearchInfluencerRowFromDB[]
): InfluencerNormalized[] =>
  rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    account_name: row.account_name,
    gender: row.gender,
    keywords: row.keywords,
    profile_image_url: row.profile_image_url,
    accounts_metrics: pickLatest(row.accounts_metrics),

    // Important:
    // This is now only a frontend compatibility field.
    // It no longer comes from sns_accounts.bookmarks.
    bookmarks: [],
  }));

const attachUserBookmarkState = async (
  influencers: InfluencerNormalized[],
  userId?: string
): Promise<InfluencerNormalized[]> => {
  if (!userId || influencers.length === 0) {
    return influencers.map((influencer) => ({
      ...influencer,
      bookmarks: [],
    }));
  }

  const accountIds = influencers.map((influencer) => influencer.id);

  const { data, error } = await supabase
    .from("user_bookmarks")
    .select("account_id")
    .eq("user_id", userId)
    .in("account_id", accountIds);

  if (error) {
    throwUserBookmarksError(error);
  }

  const bookmarkedAccountIds = new Set(
    (data ?? []).map((row) => Number(row.account_id))
  );

  return influencers.map((influencer) => ({
    ...influencer,
    bookmarks: bookmarkedAccountIds.has(influencer.id) ? [userId] : [],
  }));
};

const attachPostActivity = (
  influencers: InfluencerNormalized[],
  postRows: PostActivityRow[]
): InfluencerNormalized[] => {
  const activityByAccount = new Map<
    number,
    {
      latest_posted_at: string | null;
      latest_activity_at: string | null;
      first_posted_at: string | null;
    }
  >();

  postRows.forEach((post) => {
    const current = activityByAccount.get(post.account_id) ?? {
      latest_posted_at: null,
      latest_activity_at: null,
      first_posted_at: null,
    };

    if (timestampToMs(post.posted_at) > timestampToMs(current.latest_posted_at)) {
      current.latest_posted_at = post.posted_at;
    }

    if (
      post.posted_at &&
      (!current.first_posted_at ||
        timestampToMs(post.posted_at) < timestampToMs(current.first_posted_at))
    ) {
      current.first_posted_at = post.posted_at;
    }

    const newestActivity =
      timestampToMs(post.scraped_at) > timestampToMs(post.posted_at)
        ? post.scraped_at
        : post.posted_at;

    if (timestampToMs(newestActivity) > timestampToMs(current.latest_activity_at)) {
      current.latest_activity_at = newestActivity;
    }

    activityByAccount.set(post.account_id, current);
  });

  return influencers.map((row) => {
    const activity = activityByAccount.get(row.id);

    return {
      ...row,
      ...activity,
      posting_span_days: daysBetween(
        activity?.first_posted_at,
        activity?.latest_posted_at
      ),
    };
  });
};

export const fetchCampaignOptions = async (userId: string) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, influencers")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(readableSupabaseError(error));
  }

  return (data as CampaignOption[]) ?? [];
};

export const fetchSearchResults = async (
  filters: Filters,
  userId?: string
): Promise<InfluencerNormalized[]> => {
  const [likeMin, likeMax] = filters.likes ?? [0, 10_000_000];
  const [postMin, postMax] = filters.posts ?? [0, 10_000_000];
  const [followerMin, followerMax] = filters.followers ?? [0, 10_000_000];

  let query = supabase
    .from("sns_accounts")
    .select(
      `
      id,
      platform,
      account_name,
      gender,
      keywords,
      profile_image_url,
      accounts_metrics(maximum_likes, posts, followers, metric_date)
    `
    )
    .order("metric_date", {
      foreignTable: "accounts_metrics",
      ascending: false,
    });

  if (filters.platforms?.length) {
    const orPlatforms = filters.platforms
      .map((platform) => `platform.ilike.%${platform}%`)
      .join(",");

    query = query.or(orPlatforms);
  }

  if (filters.username?.trim()) {
    query = query.ilike("account_name", `%${filters.username.trim()}%`);
  }

  if (filters.gender?.trim()) {
    query = query.ilike("gender", `%${filters.gender.trim()}%`);
  }

  if (filters.keywords?.length) {
    const orKeywords = filters.keywords
      .map((keyword) => `keywords.ilike.%${keyword}%`)
      .join(",");

    query = query.or(orKeywords);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(readableSupabaseError(error));
  }

  const normalized = normalizeInfluencerRows(
    ((data as SearchInfluencerRowFromDB[]) ?? [])
  );

  const filtered = normalized.filter((row) => {
    const metrics = row.accounts_metrics;
    const likes = normalizeMetric(metrics?.maximum_likes);
    const posts = normalizeMetric(metrics?.posts);
    const followers = normalizeMetric(metrics?.followers);

    return (
      within(likes, likeMin, likeMax) &&
      within(posts, postMin, postMax) &&
      within(followers, followerMin, followerMax)
    );
  });

  if (filtered.length === 0) {
    return [];
  }

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("account_id, posted_at, scraped_at")
    .in(
      "account_id",
      filtered.map((row) => row.id)
    );

  if (postError) {
    throw new Error(readableSupabaseError(postError));
  }

  const withPostActivity = attachPostActivity(
    filtered,
    (postData as PostActivityRow[]) ?? []
  );

  return attachUserBookmarkState(withPostActivity, userId);
};

export const updateCampaignInfluencers = async ({
  campaignId,
  userId,
  accountId,
  influencers,
}: {
  campaignId: string;
  userId: string;
  accountId: number;
  influencers: string;
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

  const { error } = await supabase
    .from("campaigns")
    .update({ influencers })
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(readableSupabaseError(error));
  }
};

export const addUserBookmark = async ({
  userId,
  accountId,
  source,
}: BookmarkMutationPayload) => {
  const { error } = await supabase
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
    );

  if (error) {
    throwUserBookmarksError(error);
  }
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