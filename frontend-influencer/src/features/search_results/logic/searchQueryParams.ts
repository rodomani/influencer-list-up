import type { Filters } from "../types";

const DEFAULT_RANGE: [number, number] = [0, 10_000_000];

const parseNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRange = (
  searchParams: URLSearchParams,
  minKey: string,
  maxKey: string
): [number, number] | undefined => {
  const min = parseNumber(searchParams.get(minKey));
  const max = parseNumber(searchParams.get(maxKey));

  if (min === null && max === null) return undefined;

  return [min ?? DEFAULT_RANGE[0], max ?? DEFAULT_RANGE[1]];
};

const listFromParams = (searchParams: URLSearchParams, key: string) =>
  searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

export const serializeSearchFilters = (filters: Filters) => {
  const searchParams = new URLSearchParams();

  filters.platforms.forEach((platform) => searchParams.append("platform", platform));
  filters.keywords?.forEach((keyword) => searchParams.append("keyword", keyword));

  if (filters.username?.trim()) {
    searchParams.set("username", filters.username.trim());
  }

  if (filters.campaignId) {
    searchParams.set("campaignId", filters.campaignId);
  }

  const ranges: Array<{
    value: number[] | undefined;
    minKey: string;
    maxKey: string;
  }> = [
    { value: filters.followers, minKey: "followersMin", maxKey: "followersMax" },
    { value: filters.posts, minKey: "postsMin", maxKey: "postsMax" },
    { value: filters.likes, minKey: "likesMin", maxKey: "likesMax" },
  ];

  ranges.forEach(({ value, minKey, maxKey }) => {
    if (!value) return;
    searchParams.set(minKey, String(value[0]));
    searchParams.set(maxKey, String(value[1]));
  });

  return searchParams.toString();
};

export const parseSearchFilters = (search: string): Filters | undefined => {
  const searchParams = new URLSearchParams(search);
  const platforms = listFromParams(searchParams, "platform");

  if (platforms.length === 0) {
    return undefined;
  }

  const keywords = listFromParams(searchParams, "keyword");

  return {
    platforms,
    username: searchParams.get("username")?.trim() || undefined,
    keywords: keywords.length ? keywords : undefined,
    followers: parseRange(searchParams, "followersMin", "followersMax"),
    posts: parseRange(searchParams, "postsMin", "postsMax"),
    likes: parseRange(searchParams, "likesMin", "likesMax"),
    campaignId: searchParams.get("campaignId") || undefined,
  };
};
