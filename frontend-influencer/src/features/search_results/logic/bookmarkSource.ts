import type { Filters } from "../types";

const isDefaultRange = (value: number[] | undefined) =>
  !value || (value[0] === 0 && value[1] === 10_000_000);

export const buildSearchBookmarkSource = (filters: Filters) => {
  const labelParts = [
    filters.platforms?.length ? filters.platforms.join(", ") : null,
    filters.keywords?.length ? `キーワード: ${filters.keywords.join(", ")}` : null,
    filters.username?.trim() ? `ユーザー名: ${filters.username.trim()}` : null,
    filters.campaignId ? "キャンペーン指定あり" : null,
  ].filter(Boolean);

  const rangeParts = [
    !isDefaultRange(filters.followers) ? `フォロワー ${filters.followers?.join("-")}` : null,
    !isDefaultRange(filters.posts) ? `投稿数 ${filters.posts?.join("-")}` : null,
    !isDefaultRange(filters.likes) ? `いいね ${filters.likes?.join("-")}` : null,
  ].filter(Boolean);

  return {
    sourceType: "search_results",
    sourceLabel: `検索結果${labelParts.length ? ` / ${labelParts.join(" / ")}` : ""}`,
    sourceDetail: {
      platforms: filters.platforms ?? [],
      keywords: filters.keywords ?? [],
      username: filters.username ?? "",
      campaignId: filters.campaignId ?? null,
      ranges: {
        followers: filters.followers ?? null,
        posts: filters.posts ?? null,
        likes: filters.likes ?? null,
      },
      summary: [...labelParts, ...rangeParts],
    },
  };
};
