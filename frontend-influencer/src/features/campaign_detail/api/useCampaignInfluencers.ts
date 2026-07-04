import { useEffect, useState } from "react";
import type { CampaignInfluencer } from "../types";
import {
  fetchCampaignInfluencers,
  removeCampaignInfluencer,
  updateCampaignInfluencerDeliverables,
  updateCampaignInfluencerQuotedPrice,
  updateCampaignInfluencerStatus,
} from "./campaignInfluencerQueries";

type UseCampaignInfluencersArgs = {
  campaignId: number | string | undefined;
  userId: string | undefined;
};

export const useCampaignInfluencers = ({
  campaignId,
  userId,
}: UseCampaignInfluencersArgs) => {
  const [campaignInfluencers, setCampaignInfluencers] = useState<CampaignInfluencer[]>([]);
  const [influencersLoading, setInfluencersLoading] = useState(false);
  const [influencersError, setInfluencersError] = useState<string | null>(null);
  const [updatingInfluencerId, setUpdatingInfluencerId] = useState<number | null>(null);

  const reloadInfluencers = async () => {
    if (!campaignId) return;
    setCampaignInfluencers(await fetchCampaignInfluencers(campaignId));
  };

  useEffect(() => {
    let cancelled = false;

    const loadInfluencers = async () => {
      if (!campaignId) {
        if (!cancelled) {
          setCampaignInfluencers([]);
          setInfluencersLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setInfluencersLoading(true);
        setInfluencersError(null);
      }

      try {
        const nextInfluencers = await fetchCampaignInfluencers(campaignId);
        if (!cancelled) {
          setCampaignInfluencers(nextInfluencers);
        }
      } catch (error) {
        if (!cancelled) {
          setInfluencersError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setInfluencersLoading(false);
        }
      }
    };

    loadInfluencers();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleInfluencerStatusChange = async (relationId: number, status: string) => {
    if (!campaignId || !userId) {
      setInfluencersError("ログインしてから候補者ステータスを更新してね。");
      return;
    }

    const previous = campaignInfluencers.find((influencer) => influencer.id === relationId);
    if (!previous) return;

    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) =>
      prev.map((influencer) =>
        influencer.id === relationId ? { ...influencer, status } : influencer
      )
    );

    try {
      await updateCampaignInfluencerStatus({
        relationId,
        campaignId,
        userId,
        status,
      });
    } catch (error) {
      setCampaignInfluencers((prev) =>
        prev.map((influencer) => (influencer.id === relationId ? previous : influencer))
      );
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleInfluencerQuotedPriceChange = async (relationId: number, rawValue: string) => {
    if (!campaignId || !userId) {
      setInfluencersError("ログインしてから見積金額を更新してね。");
      return;
    }

    const previous = campaignInfluencers.find((influencer) => influencer.id === relationId);
    if (!previous) return;

    const trimmed = rawValue.trim();
    const quotedPrice = trimmed === "" ? null : Number(trimmed);
    if (quotedPrice !== null && (Number.isNaN(quotedPrice) || quotedPrice < 0)) {
      setInfluencersError("見積金額は0以上の数字で入力してね。");
      return;
    }

    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) =>
      prev.map((influencer) =>
        influencer.id === relationId ? { ...influencer, quoted_price: quotedPrice } : influencer
      )
    );

    try {
      await updateCampaignInfluencerQuotedPrice({
        relationId,
        campaignId,
        userId,
        quotedPrice,
      });
    } catch (error) {
      setCampaignInfluencers((prev) =>
        prev.map((influencer) => (influencer.id === relationId ? previous : influencer))
      );
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleInfluencerDeliverablesChange = async ({
    relationId,
    deliverables,
    deliverableStatus,
    deliverableDueDate,
  }: {
    relationId: number;
    deliverables: string;
    deliverableStatus: string;
    deliverableDueDate: string | null;
  }) => {
    if (!campaignId || !userId) {
      setInfluencersError("ログインしてから納品情報を更新してね。");
      return;
    }

    const previous = campaignInfluencers.find((influencer) => influencer.id === relationId);
    if (!previous) return;

    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) =>
      prev.map((influencer) =>
        influencer.id === relationId
          ? {
              ...influencer,
              deliverables,
              deliverable_status: deliverableStatus,
              deliverable_due_date: deliverableDueDate,
            }
          : influencer
      )
    );

    try {
      await updateCampaignInfluencerDeliverables({
        relationId,
        campaignId,
        userId,
        deliverables,
        deliverableStatus,
        deliverableDueDate,
      });
    } catch (error) {
      setCampaignInfluencers((prev) =>
        prev.map((influencer) => (influencer.id === relationId ? previous : influencer))
      );
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleRemoveInfluencer = async (relationId: number) => {
    if (!campaignId || !userId) {
      setInfluencersError("ログインしてから候補者を削除してね。");
      return;
    }

    const previous = campaignInfluencers;
    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) => prev.filter((influencer) => influencer.id !== relationId));

    try {
      await removeCampaignInfluencer({ relationId, campaignId, userId });
    } catch (error) {
      setCampaignInfluencers(previous);
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  return {
    campaignInfluencers,
    setCampaignInfluencers,
    influencersLoading,
    influencersError,
    updatingInfluencerId,
    reloadInfluencers,
    handleInfluencerStatusChange,
    handleInfluencerQuotedPriceChange,
    handleInfluencerDeliverablesChange,
    handleRemoveInfluencer,
  };
};
