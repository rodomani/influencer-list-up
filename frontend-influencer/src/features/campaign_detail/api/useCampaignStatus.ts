import { useState, type Dispatch, type SetStateAction } from "react";
import {
  CAMPAIGN_STATUS_OPTIONS,
  isCampaignStatusValue,
  type CampaignStatusValue,
} from "@/features/campaign/logic/campaignStatus";
import { updateCampaignStatus } from "@/features/campaign/api/campaignQueries";
import type { Campaign } from "../types";

type UseCampaignStatusArgs = {
  campaign: Campaign | null | undefined;
  userId: string | undefined;
  setCampaign: Dispatch<SetStateAction<Campaign | undefined>>;
};

export const useCampaignStatus = ({
  campaign,
  userId,
  setCampaign,
}: UseCampaignStatusArgs) => {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleStatusChange = async (status: CampaignStatusValue | string) => {
    if (!campaign) return;
    if (!userId) {
      setStatusError("ログインしてからステータスを変更してね。");
      return;
    }
    if (!isCampaignStatusValue(status)) {
      setStatusError(
        `無効なステータスです。有効な値: ${CAMPAIGN_STATUS_OPTIONS.map((option) => option.value).join(", ")}`
      );
      return;
    }

    const previousStatus = campaign.status;
    setStatusUpdating(true);
    setStatusError(null);
    setCampaign((prev) => (prev ? { ...prev, status } : prev));

    try {
      await updateCampaignStatus({
        campaignId: campaign.id,
        userId,
        status,
      });
    } catch (error) {
      setCampaign((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setStatusUpdating(false);
    }
  };

  return {
    statusUpdating,
    statusError,
    handleStatusChange,
  };
};
