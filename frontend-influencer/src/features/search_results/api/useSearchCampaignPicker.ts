import { useEffect, useState } from "react";
import type { CampaignOption, CampaignTargetInfluencer } from "../types";
import { fetchCampaignOptions, updateCampaignInfluencers } from "./searchResultsQueries";

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

export const useSearchCampaignPicker = (userId: string | undefined) => {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [savingCampaignId, setSavingCampaignId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<CampaignTargetInfluencer | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCampaigns = async () => {
      if (!userId) {
        setCampaigns([]);
        return;
      }

      setCampaignsLoading(true);
      setCampaignsError(null);

      try {
        const nextCampaigns = await fetchCampaignOptions(userId);
        if (!cancelled) {
          setCampaigns(nextCampaigns);
        }
      } catch (campaignError) {
        if (!cancelled) {
          setCampaignsError(getErrorMessage(campaignError));
        }
      } finally {
        if (!cancelled) {
          setCampaignsLoading(false);
        }
      }
    };

    loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleAddToCampaign = async (campaignId: string) => {
    if (!userId || !selectedInfluencer) return;

    setSavingCampaignId(campaignId);

    try {
      await updateCampaignInfluencers({
        campaignId,
        accountId: selectedInfluencer.id,
      });
      setDialogOpen(false);
    } catch (campaignError) {
      setCampaignsError(getErrorMessage(campaignError));
    } finally {
      setSavingCampaignId(null);
    }
  };

  return {
    campaigns,
    campaignsLoading,
    campaignsError,
    savingCampaignId,
    dialogOpen,
    setDialogOpen,
    selectedInfluencer,
    selectedInfluencerName: selectedInfluencer?.account_name ?? "",
    setSelectedInfluencer,
    handleAddToCampaign,
  };
};
