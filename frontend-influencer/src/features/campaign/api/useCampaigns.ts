import { useEffect, useMemo, useState } from "react";
import {
  CAMPAIGN_STATUS_OPTIONS,
  isCampaignStatusValue,
  type CampaignStatusValue,
} from "../logic/campaignStatus";
import type { Campaign } from "../types";
import {
  buildCampaignDashboardSummary,
  splitCampaignsByStatus,
} from "../logic/campaignFormatters";
import { fetchCampaigns, updateCampaignStatus } from "./campaignQueries";

export const useCampaigns = (userId: string | undefined) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCampaigns = async () => {
      if (!userId) {
        if (!cancelled) {
          setCampaigns([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        const nextCampaigns = await fetchCampaigns(userId);
        if (!cancelled) {
          setCampaigns(nextCampaigns);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const groupedCampaigns = useMemo(
    () => splitCampaignsByStatus(campaigns),
    [campaigns]
  );
  const dashboardSummary = useMemo(
    () => buildCampaignDashboardSummary(campaigns),
    [campaigns]
  );

  const handleStatusChange = async (
    campaign: Campaign,
    status: CampaignStatusValue | string
  ) => {
    if (!userId) {
      setError("ログインしてからステータスを変更してね。");
      return;
    }
    if (!isCampaignStatusValue(status)) {
      setError(
        `無効なステータスです。有効な値: ${CAMPAIGN_STATUS_OPTIONS.map((option) => option.value).join(", ")}`
      );
      return;
    }

    const previousStatus = campaign.status;
    setUpdatingStatusId(campaign.id);
    setError(null);
    setCampaigns((prev) =>
      prev.map((item) => (item.id === campaign.id ? { ...item, status } : item))
    );

    try {
      await updateCampaignStatus({
        campaignId: campaign.id,
        userId,
        status,
      });
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : String(statusError));
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id ? { ...item, status: previousStatus } : item
        )
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return {
    campaigns,
    loading,
    error,
    updatingStatusId,
    dashboardSummary,
    handleStatusChange,
    ...groupedCampaigns,
  };
};
