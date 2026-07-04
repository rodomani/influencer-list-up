import { useEffect, useMemo, useState } from "react";
import type { Filters, InfluencerNormalized, SortOption } from "../types";
import {
  addUserBookmark,
  fetchSearchResults,
  removeUserBookmark,
} from "./searchResultsQueries";
import { buildSearchBookmarkSource } from "../logic/bookmarkSource";
import { useSearchCampaignPicker } from "./useSearchCampaignPicker";

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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedForCompare, setSelectedForCompare] = useState<InfluencerNormalized[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("recommended");

  const campaignPicker = useSearchCampaignPicker(userId);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInfluencers = influencers;

  const selectedCompareIds = useMemo(
    () => new Set(selectedForCompare.map((influencer) => influencer.id)),
    [selectedForCompare]
  );

  useEffect(() => {
    let cancelled = false;

    const loadInfluencers = async () => {
      if (!filters) {
        setError("検索条件が見つかりません。検索画面に戻ってもう一度検索してください。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setCompareError(null);

      try {
        const result = await fetchSearchResults(
          filters,
          userId,
          sortOption,
          effectiveCurrentPage,
          ITEMS_PER_PAGE
        );

        if (cancelled) return;
        setInfluencers(result.influencers);
        setTotalCount(result.totalCount);
      } catch (searchError) {
        if (cancelled) return;
        setError(getErrorMessage(searchError));
        setInfluencers([]);
        setTotalCount(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInfluencers();

    return () => {
      cancelled = true;
    };
  }, [filters, userId, sortOption, effectiveCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSortOption("recommended");
    setSelectedForCompare([]);
    setCompareError(null);
  }, [filters]);

  const applyBookmarkState = (
    influencerId: number,
    patch: Pick<InfluencerNormalized, "hasUserBookmark" | "bookmarkId">
  ) => {
    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencerId ? { ...row, ...patch } : row
      )
    );
    setSelectedForCompare((prev) =>
      prev.map((row) =>
        row.id === influencerId ? { ...row, ...patch } : row
      )
    );
  };

  const handleToggleBookmark = async (influencer: InfluencerNormalized) => {
    if (!userId) {
      setError("ブックマークするにはログインが必要です。");
      return;
    }

    const alreadyBookmarked = influencer.hasUserBookmark;
    applyBookmarkState(influencer.id, {
      hasUserBookmark: !alreadyBookmarked,
      bookmarkId: alreadyBookmarked ? undefined : influencer.bookmarkId,
    });

    try {
      if (alreadyBookmarked) {
        await removeUserBookmark({
          userId,
          accountId: influencer.id,
        });
        applyBookmarkState(influencer.id, {
          hasUserBookmark: false,
          bookmarkId: undefined,
        });
      } else {
        const source = filters ? buildSearchBookmarkSource(filters) : null;

        const bookmarkId = await addUserBookmark({
          userId,
          accountId: influencer.id,
          source,
        });
        applyBookmarkState(influencer.id, {
          hasUserBookmark: true,
          bookmarkId,
        });
      }
    } catch (bookmarkError) {
      setError(bookmarkError instanceof Error ? bookmarkError.message : String(bookmarkError));
      applyBookmarkState(influencer.id, {
        hasUserBookmark: alreadyBookmarked,
        bookmarkId: influencer.bookmarkId,
      });
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
    totalCount,
    loading,
    error,
    currentPage,
    setCurrentPage,
    selectedForCompare,
    compareError,
    sortOption,
    campaigns: campaignPicker.campaigns,
    campaignsLoading: campaignPicker.campaignsLoading,
    campaignsError: campaignPicker.campaignsError,
    savingCampaignId: campaignPicker.savingCampaignId,
    dialogOpen: campaignPicker.dialogOpen,
    setDialogOpen: campaignPicker.setDialogOpen,
    selectedInfluencerName: campaignPicker.selectedInfluencerName,
    setSelectedInfluencer: campaignPicker.setSelectedInfluencer,
    totalPages,
    effectiveCurrentPage,
    paginatedInfluencers,
    selectedCompareIds,
    itemsPerPage: ITEMS_PER_PAGE,
    compareLimit: COMPARE_LIMIT,
    compareMinimum: COMPARE_MINIMUM,
    handleAddToCampaign: campaignPicker.handleAddToCampaign,
    handleToggleBookmark,
    handleToggleCompare,
    clearCompareSelection,
    handleSortChange,
  };
};
