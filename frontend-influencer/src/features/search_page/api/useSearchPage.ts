import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CampaignOption, RangeFilterConfig, SearchFilters } from "../types";
import { RANGE_MAX, RANGE_MIN } from "../logic/searchPageConstants";
import { updateRangeValue } from "../logic/rangeInputs";
import { fetchSearchCampaigns, fetchSearchKeywordOptions } from "./searchPageQueries";

export const useSearchPage = (userId: string | undefined) => {
  const [likeValue, setLikeValue] = useState([RANGE_MIN, RANGE_MAX]);
  const [postValue, setPostValue] = useState([RANGE_MIN, RANGE_MAX]);
  const [followerValue, setFollowerValue] = useState([RANGE_MIN, RANGE_MAX]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isKeywordMenuOpen, setIsKeywordMenuOpen] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined);
  const [keywordOptions, setKeywordOptions] = useState<string[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!userId) return;
      setCampaignLoading(true);
      setCampaignError(null);

      try {
        setCampaigns(await fetchSearchCampaigns(userId));
      } catch (error) {
        setCampaignError(error instanceof Error ? error.message : String(error));
      } finally {
        setCampaignLoading(false);
      }
    };

    loadCampaigns();
  }, [userId]);

  useEffect(() => {
    const loadKeywords = async () => {
      setKeywordLoading(true);
      setKeywordError(null);

      try {
        setKeywordOptions(await fetchSearchKeywordOptions());
      } catch (error) {
        setKeywordError(error instanceof Error ? error.message : String(error));
        setKeywordOptions([]);
      } finally {
        setKeywordLoading(false);
      }
    };

    loadKeywords();
  }, []);

  const handleRangeInputChange = (
    nextRaw: number,
    index: 0 | 1,
    current: number[],
    setter: Dispatch<SetStateAction<number[]>>
  ) => {
    setter(updateRangeValue(nextRaw, index, current));
  };

  const toggleKeyword = (value: string) => {
    setKeywords((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const togglePlatform = (value: string) => {
    setPlatforms((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const buildSearchFilters = (): SearchFilters | null => {
    if (platforms.length === 0) {
      setPlatformError("プラットフォームを1つ以上選んでね。");
      return null;
    }

    setPlatformError(null);
    return {
      platforms,
      username,
      keywords,
      likes: likeValue,
      posts: postValue,
      followers: followerValue,
      campaignId: selectedCampaignId,
    };
  };

  const rangeFilters: RangeFilterConfig[] = useMemo(
    () => [
      {
        key: "likes",
        title: "いいね数の範囲",
        value: likeValue,
        setter: setLikeValue,
        label: "いいね数の範囲",
      },
      {
        key: "posts",
        title: "投稿数の範囲",
        value: postValue,
        setter: setPostValue,
        label: "投稿数の範囲",
      },
      {
        key: "followers",
        title: "フォロワー数の範囲",
        value: followerValue,
        setter: setFollowerValue,
        label: "フォロワー数の範囲",
      },
    ],
    [followerValue, likeValue, postValue]
  );

  return {
    likeValue,
    postValue,
    followerValue,
    keywords,
    isKeywordMenuOpen,
    setIsKeywordMenuOpen,
    platforms,
    platformError,
    username,
    setUsername,
    campaigns,
    campaignLoading,
    campaignError,
    selectedCampaignId,
    setSelectedCampaignId,
    keywordOptions,
    keywordLoading,
    keywordError,
    rangeFilters,
    handleRangeInputChange,
    toggleKeyword,
    togglePlatform,
    buildSearchFilters,
  };
};
