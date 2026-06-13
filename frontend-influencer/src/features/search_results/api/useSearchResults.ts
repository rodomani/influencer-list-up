import { useEffect, useMemo, useState } from "react";
import type {
  CampaignOption,
  CampaignTargetInfluencer,
  Filters,
  InfluencerNormalized,
  SortOption,
} from "../types";
import { sortInfluencers } from "../logic/sorting";
import {
  addUserBookmark,
  fetchCampaignOptions,
  fetchSearchResults,
  removeUserBookmark,
  saveBookmarkSource,
  updateCampaignInfluencers,
} from "./searchResultsQueries";
import { buildSearchBookmarkSource } from "../logic/bookmarkSource";

const ITEMS_PER_PAGE = 10;
const COMPARE_LIMIT = 5;
const COMPARE_MINIMUM = 2;

const getErrorMessage = (error: unknown): string => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const useSearchResults = (filters: Filters | undefined, userId: string | undefined) => {
  const [influencers, setInfluencers] = useState<InfluencerNormalized[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedForCompare, setSelectedForCompare] = useState<InfluencerNormalized[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("recommended");

  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [savingCampaignId, setSavingCampaignId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<CampaignTargetInfluencer | null>(null);

  const sortedInfluencers = useMemo(
    () => sortInfluencers(influencers, sortOption),
    [influencers, sortOption]
  );

  const totalPages = Math.max(1, Math.ceil(sortedInfluencers.length / ITEMS_PER_PAGE));

  const effectiveCurrentPage = Math.min(currentPage, totalPages);

  const paginatedInfluencers = useMemo(() => {
    const start = (effectiveCurrentPage - 1) * ITEMS_PER_PAGE;
    return sortedInfluencers.slice(start, start + ITEMS_PER_PAGE);
  }, [effectiveCurrentPage, sortedInfluencers]);

  const selectedCompareIds = useMemo(
    () => new Set(selectedForCompare.map((influencer) => influencer.id)),
    [selectedForCompare]
  );

  const applyBookmarkState = (influencerId: number, nextBookmarks: string[]) => {
    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencerId ? { ...row, bookmarks: nextBookmarks } : row
      )
    );

    setSelectedForCompare((prev) =>
      prev.map((row) =>
        row.id === influencerId ? { ...row, bookmarks: nextBookmarks } : row
      )
    );
  };

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!userId) return;

      setCampaignsLoading(true);
      setCampaignsError(null);

      try {
        setCampaigns(await fetchCampaignOptions(userId));
      } catch (campaignError) {
        setCampaignsError(getErrorMessage(campaignError));
      } finally {
        setCampaignsLoading(false);
      }
    };

    loadCampaigns();
  }, [userId]);

  useEffect(() => {
    const loadInfluencers = async () => {
      if (!filters) {
        setError("検索条件が見つかりません。検索画面に戻ってもう一度検索してください。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setCompareError(null);
      setCurrentPage(1);
      setSortOption("recommended");

      try {
        setInfluencers(await fetchSearchResults(filters, userId));
        setSelectedForCompare([]);
      } catch (searchError) {
        setError(getErrorMessage(searchError));
        setInfluencers([]);
      } finally {
        setLoading(false);
      }
    };

    loadInfluencers();
  }, [filters, userId]);

  const handleAddToCampaign = async (campaignId: string) => {
    if (!userId || !selectedInfluencer) return;

    setSavingCampaignId(campaignId);

    const existing = campaigns.find((campaign) => campaign.id === campaignId);
    const existingNames =
      existing?.influencers
        ?.split(",")
        .map((name) => name.trim())
        .filter(Boolean) ?? [];

    const updatedInfluencers = existingNames.includes(selectedInfluencer.account_name)
      ? existingNames.join(", ")
      : [...existingNames, selectedInfluencer.account_name].join(", ");

    try {
      await updateCampaignInfluencers({
        campaignId,
        userId,
        accountId: selectedInfluencer.id,
        influencers: updatedInfluencers,
      });

      if (existing) {
        setCampaigns((prev) =>
          prev.map((campaign) =>
            campaign.id === campaignId ? { ...campaign, influencers: updatedInfluencers } : campaign
          )
        );
        setDialogOpen(false);
      }
    } catch (campaignError) {
      setCampaignsError(getErrorMessage(campaignError));
    } finally {
      setSavingCampaignId(null);
    }
  };

  const handleToggleBookmark = async (influencer: InfluencerNormalized) => {
    if (!userId) {
      setError("ブックマークするにはログインが必要です。");
      return;
    }
  
    const previousBookmarks = influencer.bookmarks ?? [];
    const alreadyBookmarked = previousBookmarks.includes(userId);
  
    const nextBookmarks = alreadyBookmarked
      ? previousBookmarks.filter((id) => id !== userId)
      : Array.from(new Set([...previousBookmarks, userId]));
  
    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencer.id ? { ...row, bookmarks: nextBookmarks } : row
      )
    );
  
    try {
      if (alreadyBookmarked) {
        await removeUserBookmark({
          userId,
          accountId: influencer.id,
        });
      } else {
        const source = filters ? buildSearchBookmarkSource(filters) : null;
  
        await addUserBookmark({
          userId,
          accountId: influencer.id,
          source,
        });
      }
    } catch (bookmarkError) {
      setError(bookmarkError instanceof Error ? bookmarkError.message : String(bookmarkError));
  
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, bookmarks: previousBookmarks } : row
        )
      );
    }
  };

  const handleToggleCompare = (influencer: InfluencerNormalized) => {
    const alreadySelected = selectedCompareIds.has(influencer.id);
    setCompareError(null);

    if (alreadySelected) {
      setSelectedForCompare((prev) => prev.filter((row) => row.id !== influencer.id));
      return;
    }

    if (selectedForCompare.length >= COMPARE_LIMIT) {
      setCompareError(`比較できる候補者は最大${COMPARE_LIMIT}人までです。`);
      return;
    }

    setSelectedForCompare((prev) => [...prev, influencer]);
  };

  const clearCompareSelection = () => {
    setSelectedForCompare([]);
    setCompareError(null);
  };

  const handleSortChange = (value: string) => {
    setSortOption(value as SortOption);
    setCurrentPage(1);
  };

  return {
    influencers,
    loading,
    error,
    currentPage,
    setCurrentPage,
    selectedForCompare,
    compareError,
    sortOption,
    campaigns,
    campaignsLoading,
    campaignsError,
    savingCampaignId,
    dialogOpen,
    setDialogOpen,
    selectedInfluencerName: selectedInfluencer?.account_name ?? "",
    setSelectedInfluencer,
    totalPages,
    effectiveCurrentPage,
    paginatedInfluencers,
    selectedCompareIds,
    itemsPerPage: ITEMS_PER_PAGE,
    compareLimit: COMPARE_LIMIT,
    compareMinimum: COMPARE_MINIMUM,
    handleAddToCampaign,
    handleToggleBookmark,
    handleToggleCompare,
    clearCompareSelection,
    handleSortChange,
  };
};