import { supabase } from "@/lib/supabase";
import type {
  BookmarkedInfluencer,
  BookmarkContactInfo,
  BookmarkPriceMemory,
  BookmarkResearchChecklist,
  BookmarkSavedSnapshot,
  BookmarkFolder,
  BookmarkFolderItem,
  BookmarkMemo,
  BookmarkMetricsRow,
  BookmarkPriority,
  BookmarkPriorityValue,
  BookmarkReadiness,
  BookmarkReadinessValue,
  BookmarkRiskLevelValue,
  BookmarkRiskProfile,
  BookmarkSavedSource,
  BookmarkTag,
  BookmarkTagItem,
} from "../types";
import { DEFAULT_BOOKMARK_RESEARCH_CHECKLIST } from "../types";
import {
  isMissingSchemaObjectError,
  readableSupabaseError,
  type SupabaseErrorLike,
} from "@/lib/supabaseErrors";

const USER_BOOKMARKS_TABLE = "user_bookmarks";
const BOOKMARK_FOLDERS_TABLE = "bookmark_folders";
const BOOKMARK_FOLDER_ITEMS_TABLE = "bookmark_folder_items";
const BOOKMARK_TAGS_TABLE = "bookmark_tags";
const BOOKMARK_TAG_ITEMS_TABLE = "bookmark_tag_items";

type UserBookmarkRow = {
  id: number;
  user_id: string;
  account_id: number;
  priority: BookmarkPriorityValue | null;
  personal_rating?: number | null;
  candidate_readiness?: BookmarkReadinessValue | null;
  risk_level?: BookmarkRiskLevelValue | null;
  risk_notes?: string | null;
  estimated_price_min?: number | null;
  estimated_price_max?: number | null;
  price_note?: string | null;
  price_checked_at?: string | null;
  contact_info?: Record<string, unknown> | null;
  saved_snapshot?: Record<string, unknown> | null;
  research_checklist?: Record<string, unknown> | null;
  saved_reason: string | null;
  private_memo?: string | null;
  saved_source: string | null;
  saved_source_detail: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type SnsAccountBookmarkRow = {
  id: number;
  platform: string;
  account_name: string;
  gender: string | null;
  keywords: string | null;
  profile_image_url: string | null;
  last_profile_scraped_at: string | null;
};

type LatestAccountMetricRow = {
  account_id: number | null;
  followers: number | null;
  posts: number | null;
  maximum_likes: number | null;
  metric_date: string | null;
};

type LatestActivityRow = {
  account_id: number | null;
  latest_posted_at: string | null;
  latest_activity_at: string | null;
};

type BookmarkFolderItemDbRow = {
  id: number;
  folder_id: number;
  bookmark_id: number;
  created_at: string;
};

type BookmarkTagItemDbRow = {
  id: number;
  tag_id: number;
  bookmark_id: number;
  created_at: string;
};

type BookmarkMutationPayload = {
  userId: string;
  accountId: number;
};

const USER_BOOKMARK_IDENTIFIERS = [
  USER_BOOKMARKS_TABLE,
  "priority",
  "personal_rating",
  "candidate_readiness",
  "risk_level",
  "risk_notes",
  "estimated_price_min",
  "estimated_price_max",
  "price_note",
  "price_checked_at",
  "contact_info",
  "saved_snapshot",
  "research_checklist",
  "saved_reason",
  "private_memo",
  "saved_source",
  "saved_source_detail",
];

const USER_BOOKMARK_TABLE_IDENTIFIERS = [USER_BOOKMARKS_TABLE];

const isMissingPersistenceObject = (error: SupabaseErrorLike, identifiers: string[]) =>
  isMissingSchemaObjectError(error, identifiers);

const throwReadableError = (error: SupabaseErrorLike) => {
  throw new Error(readableSupabaseError(error));
};

const throwUserBookmarksError = (error: SupabaseErrorLike) => {
  const message = readableSupabaseError(error);

  if (isMissingSchemaObjectError(error, USER_BOOKMARK_TABLE_IDENTIFIERS)) {
    throw new Error(
      `user_bookmarks テーブルがPostgRESTに認識されていません。SQL Editorで "NOTIFY pgrst, 'reload schema';" を実行してください。詳細: ${message}`
    );
  }

  if (isMissingSchemaObjectError(error, USER_BOOKMARK_IDENTIFIERS)) {
    throw new Error(
      `user_bookmarks のカラムが認識されていません。priority / personal_rating / candidate_readiness / risk_level / risk_notes / estimated_price_min / estimated_price_max / price_note / price_checked_at / contact_info / saved_snapshot / research_checklist / saved_reason / private_memo / saved_source / saved_source_detail が存在するか確認してください。詳細: ${message}`
    );
  }

  throw new Error(message);
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const toResearchChecklist = (value: unknown): BookmarkResearchChecklist => {
  const record = toRecord(value);

  return {
    profile_checked: record.profile_checked === true,
    latest_posts_checked: record.latest_posts_checked === true,
    comments_checked: record.comments_checked === true,
    risk_checked: record.risk_checked === true,
    price_checked: record.price_checked === true,
    contact_checked: record.contact_checked === true,
    audience_fit_checked: record.audience_fit_checked === true,
    brand_fit_checked: record.brand_fit_checked === true,
  };
};

const toPriceMemory = (row: UserBookmarkRow): BookmarkPriceMemory => ({
  estimated_price_min: row.estimated_price_min ?? null,
  estimated_price_max: row.estimated_price_max ?? null,
  price_note: row.price_note ?? "",
  price_checked_at: row.price_checked_at ?? null,
});

const toContactInfo = (value: unknown): BookmarkContactInfo => {
  const record = toRecord(value);

  return {
    email: typeof record.email === "string" ? record.email : "",
    agency: typeof record.agency === "string" ? record.agency : "",
    dmUrl: typeof record.dmUrl === "string" ? record.dmUrl : "",
    preferredMethod:
      typeof record.preferredMethod === "string" ? record.preferredMethod : "",
    lastContactedAt:
      typeof record.lastContactedAt === "string" ? record.lastContactedAt : "",
    responseSpeed:
      typeof record.responseSpeed === "string" ? record.responseSpeed : "",
    contactPerson:
      typeof record.contactPerson === "string" ? record.contactPerson : "",
    phone: typeof record.phone === "string" ? record.phone : "",
    nextFollowUpAt:
      typeof record.nextFollowUpAt === "string" ? record.nextFollowUpAt : "",
    notes: typeof record.notes === "string" ? record.notes : "",
  };
};

const toSavedSnapshot = (value: unknown): BookmarkSavedSnapshot | null => {
  const record = toRecord(value);

  if (Object.keys(record).length === 0) {
    return null;
  }

  return {
    followers: typeof record.followers === "number" ? record.followers : null,
    posts: typeof record.posts === "number" ? record.posts : null,
    maximumLikes: typeof record.maximumLikes === "number" ? record.maximumLikes : null,
    metricDate: typeof record.metricDate === "string" ? record.metricDate : "",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : "",
  };
};

const USER_BOOKMARK_SELECT = `
  id,
  user_id,
  account_id,
  priority,
  personal_rating,
  candidate_readiness,
  risk_level,
  risk_notes,
  estimated_price_min,
  estimated_price_max,
  price_note,
  price_checked_at,
  contact_info,
  saved_snapshot,
  research_checklist,
  saved_reason,
  private_memo,
  saved_source,
  saved_source_detail,
  created_at,
  updated_at
`;

const fetchUserBookmarkRows = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds?: number[];
}): Promise<UserBookmarkRow[]> => {
  let query = supabase
    .from(USER_BOOKMARKS_TABLE)
    .select(USER_BOOKMARK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (accountIds && accountIds.length > 0) {
    query = query.in("account_id", accountIds);
  }

  const { data, error } = await query;

  if (error) {
    throwUserBookmarksError(error);
  }

  return (data as UserBookmarkRow[]) ?? [];
};

const ensureUserBookmark = async ({
  userId,
  accountId,
}: BookmarkMutationPayload): Promise<UserBookmarkRow> => {
  const { data: existingBookmark, error: existingBookmarkError } = await supabase
    .from(USER_BOOKMARKS_TABLE)
    .select(USER_BOOKMARK_SELECT)
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingBookmarkError) {
    throwUserBookmarksError(existingBookmarkError);
  }

  if (existingBookmark) {
    return existingBookmark as UserBookmarkRow;
  }

  const { data, error } = await supabase
    .from(USER_BOOKMARKS_TABLE)
    .upsert(
      {
        user_id: userId,
        account_id: accountId,
      },
      {
        onConflict: "user_id,account_id",
      }
    )
    .select(USER_BOOKMARK_SELECT)
    .single();

  if (error) {
    throwUserBookmarksError(error);
  }

  return data as UserBookmarkRow;
};

const upsertUserBookmarkFields = async ({
  userId,
  accountId,
  fields,
}: BookmarkMutationPayload & {
  fields: Partial<UserBookmarkRow>;
}) => {
  const { error } = await supabase.from(USER_BOOKMARKS_TABLE).upsert(
    {
      user_id: userId,
      account_id: accountId,
      ...fields,
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

const fetchBookmarkIdLookup = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  if (accountIds.length === 0) {
    return {
      bookmarkIds: [] as number[],
      accountIdByBookmarkId: new Map<number, number>(),
    };
  }

  const bookmarkRows = await fetchUserBookmarkRows({
    userId,
    accountIds,
  });

  const accountIdByBookmarkId = new Map<number, number>();

  bookmarkRows.forEach((row) => {
    accountIdByBookmarkId.set(row.id, row.account_id);
  });

  return {
    bookmarkIds: bookmarkRows.map((row) => row.id),
    accountIdByBookmarkId,
  };
};

const isUserBookmarksPersistenceError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const schemaError = error as SupabaseErrorLike;

  return (
    isMissingSchemaObjectError(schemaError, USER_BOOKMARK_TABLE_IDENTIFIERS) ||
    isMissingSchemaObjectError(schemaError, USER_BOOKMARK_IDENTIFIERS)
  );
};

const normalizeBookmarkRows = ({
  rows,
  metricsByAccount,
  activityByAccount,
  orderedAccountIds,
  ratingByAccount,
  readinessByAccount,
  riskLevelByAccount,
  riskNotesByAccount,
  priceMemoryByAccount,
  contactInfoByAccount,
  savedSnapshotByAccount,
  researchChecklistByAccount,
}: {
  rows: SnsAccountBookmarkRow[];
  metricsByAccount: Map<number, BookmarkMetricsRow | null>;
  activityByAccount: Map<number, LatestActivityRow>;
  orderedAccountIds: number[];
  ratingByAccount: Map<number, 1 | 2 | 3 | 4 | 5 | null>;
  readinessByAccount: Map<number, BookmarkReadinessValue>;
  riskLevelByAccount: Map<number, BookmarkRiskLevelValue>;
  riskNotesByAccount: Map<number, string>;
  priceMemoryByAccount: Map<number, BookmarkPriceMemory>;
  contactInfoByAccount: Map<number, BookmarkContactInfo>;
  savedSnapshotByAccount: Map<number, BookmarkSavedSnapshot | null>;
  researchChecklistByAccount: Map<number, BookmarkResearchChecklist>;
}): BookmarkedInfluencer[] => {
  const orderByAccountId = new Map<number, number>();

  orderedAccountIds.forEach((accountId, index) => {
    orderByAccountId.set(accountId, index);
  });

  return rows
    .map((row) => ({
      id: row.id,
      platform: row.platform,
      account_name: row.account_name,
      gender: row.gender,
      keywords: row.keywords,
      profile_image_url: row.profile_image_url,
      accounts_metrics: metricsByAccount.get(row.id) ?? null,
      last_profile_scraped_at: row.last_profile_scraped_at,
      hasUserBookmark: true,

      latest_posted_at: activityByAccount.get(row.id)?.latest_posted_at ?? null,
      latest_activity_at: activityByAccount.get(row.id)?.latest_activity_at ?? null,
      folderIds: [],
      tagIds: [],
      priority: null,
      candidateReadiness: readinessByAccount.get(row.id) ?? "未確認",
      riskLevel: riskLevelByAccount.get(row.id) ?? "unknown",
      riskNotes: riskNotesByAccount.get(row.id) ?? "",
      priceMemory: priceMemoryByAccount.get(row.id) ?? {
        estimated_price_min: null,
        estimated_price_max: null,
        price_note: "",
        price_checked_at: null,
      },
      contactInfo: contactInfoByAccount.get(row.id) ?? {
        email: "",
        agency: "",
        dmUrl: "",
        preferredMethod: "",
        lastContactedAt: "",
        responseSpeed: "",
        contactPerson: "",
        phone: "",
        nextFollowUpAt: "",
        notes: "",
      },
      savedSnapshot: savedSnapshotByAccount.get(row.id) ?? null,
      researchChecklist:
        researchChecklistByAccount.get(row.id) ?? { ...DEFAULT_BOOKMARK_RESEARCH_CHECKLIST },
      whySavedMemo: "",
      savedSource: null,
      personalRating: ratingByAccount.get(row.id) ?? null,
    }))
    .sort(
      (a, b) =>
        (orderByAccountId.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderByAccountId.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
};

const mapSavedSource = (row: UserBookmarkRow): BookmarkSavedSource | null => {
  const detail = toRecord(row.saved_source_detail);

  if (!row.saved_source && Object.keys(detail).length === 0) {
    return null;
  }

  const nestedSourceDetail = toRecord(detail.sourceDetail);

  return {
    id: row.id,
    user_id: row.user_id,
    account_id: row.account_id,
    source_type: row.saved_source ?? "unknown",
    source_label:
      typeof detail.sourceLabel === "string"
        ? detail.sourceLabel
        : row.saved_source ?? "保存元不明",
    source_detail:
      Object.keys(nestedSourceDetail).length > 0
        ? nestedSourceDetail
        : detail,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as BookmarkSavedSource;
};

export const fetchBookmarkedInfluencers = async (userId: string) => {
  const bookmarkRows = await fetchUserBookmarkRows({ userId });

  if (bookmarkRows.length === 0) {
    return [];
  }

  const accountIds = bookmarkRows.map((row) => row.account_id);
  const ratingByAccount = new Map<number, 1 | 2 | 3 | 4 | 5 | null>();
  const readinessByAccount = new Map<number, BookmarkReadinessValue>();
  const riskLevelByAccount = new Map<number, BookmarkRiskLevelValue>();
  const riskNotesByAccount = new Map<number, string>();
  const priceMemoryByAccount = new Map<number, BookmarkPriceMemory>();
  const contactInfoByAccount = new Map<number, BookmarkContactInfo>();
  const savedSnapshotByAccount = new Map<number, BookmarkSavedSnapshot | null>();
  const researchChecklistByAccount = new Map<number, BookmarkResearchChecklist>();
  const metricsByAccount = new Map<number, BookmarkMetricsRow | null>();
  const activityByAccount = new Map<number, LatestActivityRow>();

  bookmarkRows.forEach((row) => {
    ratingByAccount.set(row.account_id, (row.personal_rating as 1 | 2 | 3 | 4 | 5 | null) ?? null);
    readinessByAccount.set(row.account_id, row.candidate_readiness ?? "未確認");
    riskLevelByAccount.set(row.account_id, row.risk_level ?? "unknown");
    riskNotesByAccount.set(row.account_id, row.risk_notes ?? "");
    priceMemoryByAccount.set(row.account_id, toPriceMemory(row));
    contactInfoByAccount.set(row.account_id, toContactInfo(row.contact_info));
    savedSnapshotByAccount.set(row.account_id, toSavedSnapshot(row.saved_snapshot));
    researchChecklistByAccount.set(
      row.account_id,
      toResearchChecklist(row.research_checklist)
    );
  });

  const { data, error } = await supabase
    .from("sns_accounts")
    .select(
      `
      id,
      platform,
      account_name,
      gender,
      keywords,
      profile_image_url,
      last_profile_scraped_at
    `
    )
    .in("id", accountIds);

  if (error) {
    throwReadableError(error);
  }

  const [{ data: metricRows, error: metricError }, { data: activityRows, error: activityError }] =
    await Promise.all([
      supabase
        .from("latest_account_metrics")
        .select("account_id, maximum_likes, posts, followers, metric_date")
        .in("account_id", accountIds),
      supabase
        .from("influencer_latest_activity")
        .select("account_id, latest_posted_at, latest_activity_at")
        .in("account_id", accountIds),
    ]);

  if (metricError) {
    throwReadableError(metricError);
  }

  ((metricRows as LatestAccountMetricRow[] | null) ?? []).forEach((row) => {
    if (row.account_id === null) return;

    metricsByAccount.set(row.account_id, {
      maximum_likes: row.maximum_likes,
      posts: row.posts,
      followers: row.followers,
      metric_date: row.metric_date,
    });
  });

  if (activityError) {
    console.error("Failed to load bookmark activity summary", {
      accountIds,
      error: activityError,
    });
  } else {
    ((activityRows as LatestActivityRow[] | null) ?? []).forEach((row) => {
      if (row.account_id === null) return;
      activityByAccount.set(row.account_id, row);
    });
  }

  const normalized = normalizeBookmarkRows({
    rows: (data as SnsAccountBookmarkRow[]) ?? [],
    metricsByAccount,
    activityByAccount,
    orderedAccountIds: accountIds,
    ratingByAccount,
    readinessByAccount,
    riskLevelByAccount,
    riskNotesByAccount,
    priceMemoryByAccount,
    contactInfoByAccount,
    savedSnapshotByAccount,
    researchChecklistByAccount,
  });

  if (normalized.length === 0) {
    return [];
  }

  return normalized;
};

export const addUserBookmark = async ({
  userId,
  accountId,
}: BookmarkMutationPayload) => {
  await ensureUserBookmark({
    userId,
    accountId,
  });
};

export const removeUserBookmark = async ({
  userId,
  accountId,
}: BookmarkMutationPayload) => {
  const { error } = await supabase
    .from(USER_BOOKMARKS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("account_id", accountId);

  if (error) {
    throwUserBookmarksError(error);
  }
};

export const fetchBookmarkFolders = async (userId: string) => {
  const { data, error } = await supabase
    .from(BOOKMARK_FOLDERS_TABLE)
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_FOLDERS_TABLE])) {
      return { folders: [] as BookmarkFolder[], persistenceReady: false };
    }

    throw new Error(readableSupabaseError(error));
  }

  return {
    folders: (data as BookmarkFolder[]) ?? [],
    persistenceReady: true,
  };
};

export const createBookmarkFolder = async ({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) => {
  const { data, error } = await supabase
    .from(BOOKMARK_FOLDERS_TABLE)
    .insert({ user_id: userId, name })
    .select("id, user_id, name, created_at, updated_at")
    .single();

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_FOLDERS_TABLE])) {
      throw new Error(
        "フォルダーを保存するには、bookmark_folders のマイグレーションをSupabaseへ反映してください。"
      );
    }

    throw new Error(readableSupabaseError(error));
  }

  return data as BookmarkFolder;
};

export const fetchBookmarkFolderItems = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  const { bookmarkIds, accountIdByBookmarkId } = await fetchBookmarkIdLookup({
    userId,
    accountIds,
  });

  if (bookmarkIds.length === 0) {
    return { items: [] as BookmarkFolderItem[], persistenceReady: true };
  }

  const { data, error } = await supabase
    .from(BOOKMARK_FOLDER_ITEMS_TABLE)
    .select("id, folder_id, bookmark_id, created_at")
    .in("bookmark_id", bookmarkIds);

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_FOLDER_ITEMS_TABLE, "bookmark_id"])) {
      return { items: [] as BookmarkFolderItem[], persistenceReady: false };
    }

    throw new Error(readableSupabaseError(error));
  }

  const items = ((data as BookmarkFolderItemDbRow[]) ?? [])
    .map((item) => {
      const accountId = accountIdByBookmarkId.get(item.bookmark_id);

      if (!accountId) return null;

      return {
        id: item.id,
        folder_id: item.folder_id,
        user_id: userId,
        account_id: accountId,
        created_at: item.created_at,
      } as BookmarkFolderItem;
    })
    .filter((item): item is BookmarkFolderItem => Boolean(item));

  return {
    items,
    persistenceReady: true,
  };
};

export const addInfluencerToBookmarkFolder = async ({
  userId,
  folderId,
  accountId,
}: {
  userId: string;
  folderId: number;
  accountId: number;
}) => {
  const bookmark = await ensureUserBookmark({
    userId,
    accountId,
  });

  const { error } = await supabase.from(BOOKMARK_FOLDER_ITEMS_TABLE).upsert(
    {
      folder_id: folderId,
      bookmark_id: bookmark.id,
    },
    {
      onConflict: "folder_id,bookmark_id",
    }
  );

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_FOLDER_ITEMS_TABLE, "bookmark_id"])) {
      throw new Error(
        "フォルダーを使うには、bookmark_folder_items のマイグレーションをSupabaseへ反映してください。"
      );
    }

    throw new Error(readableSupabaseError(error));
  }
};

export const removeInfluencerFromBookmarkFolder = async ({
  userId,
  folderId,
  accountId,
}: {
  userId: string;
  folderId: number;
  accountId: number;
}) => {
  const bookmarkRows = await fetchUserBookmarkRows({
    userId,
    accountIds: [accountId],
  });

  const bookmark = bookmarkRows[0];

  if (!bookmark) return;

  const { error } = await supabase
    .from(BOOKMARK_FOLDER_ITEMS_TABLE)
    .delete()
    .eq("folder_id", folderId)
    .eq("bookmark_id", bookmark.id);

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_FOLDER_ITEMS_TABLE, "bookmark_id"])) {
      throw new Error(
        "フォルダーを使うには、bookmark_folder_items のマイグレーションをSupabaseへ反映してください。"
      );
    }

    throw new Error(readableSupabaseError(error));
  }
};

export const fetchBookmarkTags = async (userId: string) => {
  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE)
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_TAGS_TABLE])) {
      return { tags: [] as BookmarkTag[], persistenceReady: false };
    }

    throw new Error(readableSupabaseError(error));
  }

  return {
    tags: (data as BookmarkTag[]) ?? [],
    persistenceReady: true,
  };
};

export const createBookmarkTag = async ({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) => {
  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE)
    .insert({ user_id: userId, name })
    .select("id, user_id, name, created_at, updated_at")
    .single();

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_TAGS_TABLE])) {
      throw new Error(
        "タグを保存するには、bookmark_tags のマイグレーションをSupabaseへ反映してください。"
      );
    }

    throw new Error(readableSupabaseError(error));
  }

  return data as BookmarkTag;
};

export const fetchBookmarkTagItems = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  const { bookmarkIds, accountIdByBookmarkId } = await fetchBookmarkIdLookup({
    userId,
    accountIds,
  });

  if (bookmarkIds.length === 0) {
    return { items: [] as BookmarkTagItem[], persistenceReady: true };
  }

  const { data, error } = await supabase
    .from(BOOKMARK_TAG_ITEMS_TABLE)
    .select("id, tag_id, bookmark_id, created_at")
    .in("bookmark_id", bookmarkIds);

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_TAG_ITEMS_TABLE, "bookmark_id"])) {
      return { items: [] as BookmarkTagItem[], persistenceReady: false };
    }

    throw new Error(readableSupabaseError(error));
  }

  const items = ((data as BookmarkTagItemDbRow[]) ?? [])
    .map((item) => {
      const accountId = accountIdByBookmarkId.get(item.bookmark_id);

      if (!accountId) return null;

      return {
        id: item.id,
        tag_id: item.tag_id,
        user_id: userId,
        account_id: accountId,
        created_at: item.created_at,
      } as BookmarkTagItem;
    })
    .filter((item): item is BookmarkTagItem => Boolean(item));

  return {
    items,
    persistenceReady: true,
  };
};

export const addInfluencerToBookmarkTag = async ({
  userId,
  tagId,
  accountId,
}: {
  userId: string;
  tagId: number;
  accountId: number;
}) => {
  const bookmark = await ensureUserBookmark({
    userId,
    accountId,
  });

  const { error } = await supabase.from(BOOKMARK_TAG_ITEMS_TABLE).upsert(
    {
      tag_id: tagId,
      bookmark_id: bookmark.id,
    },
    {
      onConflict: "tag_id,bookmark_id",
    }
  );

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_TAG_ITEMS_TABLE, "bookmark_id"])) {
      throw new Error(
        "タグを使うには、bookmark_tag_items のマイグレーションをSupabaseへ反映してください。"
      );
    }

    throw new Error(readableSupabaseError(error));
  }
};

export const removeInfluencerFromBookmarkTag = async ({
  userId,
  tagId,
  accountId,
}: {
  userId: string;
  tagId: number;
  accountId: number;
}) => {
  const bookmarkRows = await fetchUserBookmarkRows({
    userId,
    accountIds: [accountId],
  });

  const bookmark = bookmarkRows[0];

  if (!bookmark) return;

  const { error } = await supabase
    .from(BOOKMARK_TAG_ITEMS_TABLE)
    .delete()
    .eq("tag_id", tagId)
    .eq("bookmark_id", bookmark.id);

  if (error) {
    if (isMissingPersistenceObject(error, [BOOKMARK_TAG_ITEMS_TABLE, "bookmark_id"])) {
      throw new Error(
        "タグを使うには、bookmark_tag_items のマイグレーションをSupabaseへ反映してください。"
      );
    }

    throw new Error(readableSupabaseError(error));
  }
};

export const fetchBookmarkPriorities = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  if (accountIds.length === 0) {
    return { priorities: [] as BookmarkPriority[], persistenceReady: true };
  }

  try {
    const bookmarkRows = await fetchUserBookmarkRows({
      userId,
      accountIds,
    });

    const priorities = bookmarkRows
      .filter((row) => Boolean(row.priority))
      .map(
        (row) =>
          ({
            id: row.id,
            user_id: row.user_id,
            account_id: row.account_id,
            priority: row.priority,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }) as BookmarkPriority
      );

    return {
      priorities,
      persistenceReady: true,
    };
  } catch (error) {
    if (isUserBookmarksPersistenceError(error)) {
      return { priorities: [] as BookmarkPriority[], persistenceReady: false };
    }

    throw error;
  }
};

export const fetchBookmarkReadinesses = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  if (accountIds.length === 0) {
    return { readinesses: [] as BookmarkReadiness[], persistenceReady: true };
  }

  try {
    const bookmarkRows = await fetchUserBookmarkRows({
      userId,
      accountIds,
    });

    const readinesses = bookmarkRows.map(
      (row) =>
        ({
          id: row.id,
          user_id: row.user_id,
          account_id: row.account_id,
          readiness: row.candidate_readiness ?? "未確認",
          created_at: row.created_at,
          updated_at: row.updated_at,
        }) as BookmarkReadiness
    );

    return {
      readinesses,
      persistenceReady: true,
    };
  } catch (error) {
    if (isUserBookmarksPersistenceError(error)) {
      return { readinesses: [] as BookmarkReadiness[], persistenceReady: false };
    }

    throw error;
  }
};

export const fetchBookmarkRiskProfiles = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  if (accountIds.length === 0) {
    return { riskProfiles: [] as BookmarkRiskProfile[], persistenceReady: true };
  }

  try {
    const bookmarkRows = await fetchUserBookmarkRows({
      userId,
      accountIds,
    });

    const riskProfiles = bookmarkRows.map(
      (row) =>
        ({
          id: row.id,
          user_id: row.user_id,
          account_id: row.account_id,
          risk_level: row.risk_level ?? "unknown",
          risk_notes: row.risk_notes ?? "",
          created_at: row.created_at,
          updated_at: row.updated_at,
        }) as BookmarkRiskProfile
    );

    return {
      riskProfiles,
      persistenceReady: true,
    };
  } catch (error) {
    if (isUserBookmarksPersistenceError(error)) {
      return { riskProfiles: [] as BookmarkRiskProfile[], persistenceReady: false };
    }

    throw error;
  }
};

export const setBookmarkPriority = async ({
  userId,
  accountId,
  priority,
}: {
  userId: string;
  accountId: number;
  priority: BookmarkPriorityValue;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      priority,
    },
  });
};

export const clearBookmarkPriority = async ({
  userId,
  accountId,
}: {
  userId: string;
  accountId: number;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      priority: null,
    },
  });
};

export const fetchBookmarkMemos = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  if (accountIds.length === 0) {
    return { memos: [] as BookmarkMemo[], persistenceReady: true };
  }

  try {
    const bookmarkRows = await fetchUserBookmarkRows({
      userId,
      accountIds,
    });

    const memos = bookmarkRows
      .filter((row) => Boolean(row.saved_reason))
      .map(
        (row) =>
          ({
            id: row.id,
            user_id: row.user_id,
            account_id: row.account_id,
            memo: row.saved_reason ?? "",
            created_at: row.created_at,
            updated_at: row.updated_at,
          }) as BookmarkMemo
      );

    return {
      memos,
      persistenceReady: true,
    };
  } catch (error) {
    if (isUserBookmarksPersistenceError(error)) {
      return { memos: [] as BookmarkMemo[], persistenceReady: false };
    }

    throw error;
  }
};

export const saveBookmarkMemo = async ({
  userId,
  accountId,
  memo,
}: {
  userId: string;
  accountId: number;
  memo: string;
}) => {
  const trimmedMemo = memo.trim();

  if (!trimmedMemo) {
    await upsertUserBookmarkFields({
      userId,
      accountId,
      fields: {
        saved_reason: null,
      },
    });

    return "";
  }

  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      saved_reason: trimmedMemo,
    },
  });

  return trimmedMemo;
};

export const fetchBookmarkSources = async ({
  userId,
  accountIds,
}: {
  userId: string;
  accountIds: number[];
}) => {
  if (accountIds.length === 0) {
    return { sources: [] as BookmarkSavedSource[], persistenceReady: true };
  }

  try {
    const bookmarkRows = await fetchUserBookmarkRows({
      userId,
      accountIds,
    });

    const sources = bookmarkRows
      .map(mapSavedSource)
      .filter((source): source is BookmarkSavedSource => Boolean(source));

    return {
      sources,
      persistenceReady: true,
    };
  } catch (error) {
    if (isUserBookmarksPersistenceError(error)) {
      return { sources: [] as BookmarkSavedSource[], persistenceReady: false };
    }

    throw error;
  }
};

export const setBookmarkRating = async ({
  userId,
  accountId,
  rating,
}: {
  userId: string;
  accountId: number;
  rating: 1 | 2 | 3 | 4 | 5;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      personal_rating: rating,
    },
  });
};

export const clearBookmarkRating = async ({
  userId,
  accountId,
}: {
  userId: string;
  accountId: number;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      personal_rating: null,
    },
  });
};

export const setBookmarkReadiness = async ({
  userId,
  accountId,
  readiness,
}: {
  userId: string;
  accountId: number;
  readiness: BookmarkReadinessValue;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      candidate_readiness: readiness,
    },
  });
};

export const saveBookmarkRiskProfile = async ({
  userId,
  accountId,
  riskLevel,
  riskNotes,
}: {
  userId: string;
  accountId: number;
  riskLevel: BookmarkRiskLevelValue;
  riskNotes: string;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      risk_level: riskLevel,
      risk_notes: riskNotes,
    },
  });

  return {
    riskLevel,
    riskNotes,
  };
};

export const saveBookmarkPriceMemory = async ({
  userId,
  accountId,
  estimated_price_min,
  estimated_price_max,
  price_note,
}: {
  userId: string;
  accountId: number;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  price_note: string;
}) => {
  const payload = {
    estimated_price_min,
    estimated_price_max,
    price_note,
    price_checked_at: new Date().toISOString(),
  };

  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: payload,
  });

  return {
    estimated_price_min,
    estimated_price_max,
    price_note,
    price_checked_at: payload.price_checked_at,
  };
};

export const saveBookmarkContactInfo = async ({
  userId,
  accountId,
  contactInfo,
}: {
  userId: string;
  accountId: number;
  contactInfo: BookmarkContactInfo;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      contact_info: contactInfo,
    },
  });

  return contactInfo;
};

export const saveBookmarkSavedSnapshot = async ({
  userId,
  accountId,
  snapshot,
}: {
  userId: string;
  accountId: number;
  snapshot: BookmarkSavedSnapshot;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      saved_snapshot: snapshot,
    },
  });

  return snapshot;
};

export const saveBookmarkResearchChecklist = async ({
  userId,
  accountId,
  checklist,
}: {
  userId: string;
  accountId: number;
  checklist: BookmarkResearchChecklist;
}) => {
  await upsertUserBookmarkFields({
    userId,
    accountId,
    fields: {
      research_checklist: checklist,
    },
  });

  return checklist;
};
