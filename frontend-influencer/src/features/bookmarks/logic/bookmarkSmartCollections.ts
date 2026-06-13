import type { BookmarkedInfluencer } from "../types";
import { bookmarkDaysSince } from "./bookmarkFormatters";

export type BookmarkSmartCollectionId =
  | "five-star-candidates"
  | "unrated"
  | "contact-candidates"
  | "price-unchecked"
  | "high-risk"
  | "stale-over-30-days"
  | "high-priority-five-star"
  | "saved-from-search";

export type BookmarkSmartCollectionDefinition = {
  id: BookmarkSmartCollectionId;
  label: string;
  description: string;
};

export type BookmarkSmartCollectionSummary = BookmarkSmartCollectionDefinition & {
  count: number;
  influencerIds: number[];
};

const sourceLooksLikeSearchResult = (influencer: BookmarkedInfluencer) => {
  const sourceType = influencer.savedSource?.source_type?.toLowerCase() ?? "";
  const sourceLabel = influencer.savedSource?.source_label?.toLowerCase() ?? "";

  return (
    sourceType.includes("search") ||
    sourceType.includes("result") ||
    sourceLabel.includes("search") ||
    sourceLabel.includes("result") ||
    sourceLabel.includes("検索")
  );
};

const priceLooksUnchecked = (influencer: BookmarkedInfluencer) => {
  const { estimated_price_min, estimated_price_max, price_note, price_checked_at } =
    influencer.priceMemory;

  return (
    estimated_price_min === null &&
    estimated_price_max === null &&
    !price_note.trim() &&
    !price_checked_at
  );
};

export const BOOKMARK_SMART_COLLECTIONS: BookmarkSmartCollectionDefinition[] = [
  {
    id: "five-star-candidates",
    label: "5-star candidates",
    description: "5段階評価で5を付けた候補です。",
  },
  {
    id: "unrated",
    label: "未評価",
    description: "まだレーティングが付いていない候補です。",
  },
  {
    id: "contact-candidates",
    label: "連絡候補",
    description: "候補ステータスが連絡候補のブックマークです。",
  },
  {
    id: "price-unchecked",
    label: "価格未確認",
    description: "価格メモや確認日時が未入力の候補です。",
  },
  {
    id: "high-risk",
    label: "リスク高",
    description: "リスクレベルが高に設定されている候補です。",
  },
  {
    id: "stale-over-30-days",
    label: "30日以上未確認",
    description: "プロフィール確認から30日以上経過した候補です。",
  },
  {
    id: "high-priority-five-star",
    label: "高優先度 + 5-star",
    description: "優先度が高く、かつ5スター評価の候補です。",
  },
  {
    id: "saved-from-search",
    label: "保存元: 検索結果",
    description: "検索結果から保存した候補です。",
  },
];

export const matchesBookmarkSmartCollection = (
  influencer: BookmarkedInfluencer,
  collectionId: BookmarkSmartCollectionId
) => {
  switch (collectionId) {
    case "five-star-candidates":
      return influencer.personalRating === 5;
    case "unrated":
      return influencer.personalRating === null;
    case "contact-candidates":
      return influencer.candidateReadiness === "連絡候補";
    case "price-unchecked":
      return priceLooksUnchecked(influencer);
    case "high-risk":
      return influencer.riskLevel === "high";
    case "stale-over-30-days":
      return (bookmarkDaysSince(influencer.last_profile_scraped_at) ?? 0) >= 30;
    case "high-priority-five-star":
      return influencer.priority === "high" && influencer.personalRating === 5;
    case "saved-from-search":
      return sourceLooksLikeSearchResult(influencer);
    default:
      return false;
  }
};

export const filterInfluencersBySmartCollection = (
  influencers: BookmarkedInfluencer[],
  collectionId: BookmarkSmartCollectionId
) => influencers.filter((influencer) => matchesBookmarkSmartCollection(influencer, collectionId));

export const buildBookmarkSmartCollections = (
  influencers: BookmarkedInfluencer[]
): BookmarkSmartCollectionSummary[] =>
  BOOKMARK_SMART_COLLECTIONS.map((collection) => {
    const matched = filterInfluencersBySmartCollection(influencers, collection.id);

    return {
      ...collection,
      count: matched.length,
      influencerIds: matched.map((influencer) => influencer.id),
    };
  });
