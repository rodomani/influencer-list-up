import type { Dispatch, SetStateAction } from "react";

export type CampaignOption = {
  id: number | string;
  name: string | null;
};

export type SearchFilters = {
  platforms: string[];
  username: string;
  keywords: string[];
  likes: number[];
  posts: number[];
  followers: number[];
  campaignId: string | undefined;
};

export type KeywordRow = {
  keywords?: string | null;
};

export type RangeFilterKey = "likes" | "posts" | "followers";

export type RangeFilterConfig = {
  key: RangeFilterKey;
  title: string;
  label: string;
  value: number[];
  setter: Dispatch<SetStateAction<number[]>>;
};
