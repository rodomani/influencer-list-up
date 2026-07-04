import { useState, type Dispatch, type SetStateAction } from "react";
import type { Campaign } from "../types";
import { updateCampaignInternalMemo } from "./campaignDetailQueries";

type UseCampaignMemoArgs = {
  campaign: Campaign | null | undefined;
  userId: string | undefined;
  setCampaign: Dispatch<SetStateAction<Campaign | undefined>>;
};

export const useCampaignMemo = ({
  campaign,
  userId,
  setCampaign,
}: UseCampaignMemoArgs) => {
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);

  const handleInternalMemoSave = async (internalMemo: string) => {
    if (!campaign) return;
    if (!userId) {
      setMemoError("ログインしてから社内メモを保存してね。");
      return;
    }

    const previousMemo = campaign.internal_memo ?? "";
    setMemoSaving(true);
    setMemoError(null);
    setCampaign((prev) => (prev ? { ...prev, internal_memo: internalMemo } : prev));

    try {
      await updateCampaignInternalMemo({
        campaignId: campaign.id,
        userId,
        internalMemo,
      });
    } catch (error) {
      setCampaign((prev) => (prev ? { ...prev, internal_memo: previousMemo } : prev));
      setMemoError(error instanceof Error ? error.message : String(error));
    } finally {
      setMemoSaving(false);
    }
  };

  return {
    memoSaving,
    memoError,
    handleInternalMemoSave,
  };
};
