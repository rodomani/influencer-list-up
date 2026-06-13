import { useEffect, useMemo, useState } from "react";
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
    const loadCampaigns = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      try {
        setCampaigns(await fetchCampaigns(userId));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [userId]);

  const groupedCampaigns = useMemo(
    () => splitCampaignsByStatus(campaigns),
    [campaigns]
  );
  const dashboardSummary = useMemo(
    () => buildCampaignDashboardSummary(campaigns),
    [campaigns]
  );

  const handleStatusChange = async (campaign: Campaign, status: string) => {
    if (!userId) {
      setError("ログインしてからステータスを変更してね。");
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
