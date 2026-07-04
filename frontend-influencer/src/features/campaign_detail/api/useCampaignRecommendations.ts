import { useEffect, useState } from "react";
import type { Campaign, CampaignInfluencer, CampaignRecommendedInfluencer } from "../types";
import {
  addCampaignInfluencerRelation,
  recommendInfluencersForCampaign,
} from "./campaignInfluencerQueries";

type UseCampaignRecommendationsArgs = {
  campaign: Campaign | null | undefined;
  campaignInfluencers: CampaignInfluencer[];
  userId: string | undefined;
  reloadInfluencers: () => Promise<void>;
};

export const useCampaignRecommendations = ({
  campaign,
  campaignInfluencers,
  userId,
  reloadInfluencers,
}: UseCampaignRecommendationsArgs) => {
  const [recommendedInfluencers, setRecommendedInfluencers] = useState<
    CampaignRecommendedInfluencer[]
  >([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [addingRecommendedAccountId, setAddingRecommendedAccountId] = useState<number | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    const loadRecommendations = async () => {
      if (!campaign?.id) {
        if (!cancelled) {
          setRecommendedInfluencers([]);
          setRecommendationsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setRecommendationsLoading(true);
        setRecommendationsError(null);
      }

      try {
        const nextRecommendations = await recommendInfluencersForCampaign({
          campaignId: campaign.id,
          goal: campaign.goal,
          budget: campaign.budget,
          excludedAccountIds: campaignInfluencers.map((influencer) => influencer.account_id),
          limit: 6,
        });
        if (!cancelled) {
          setRecommendedInfluencers(nextRecommendations);
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendedInfluencers([]);
          setRecommendationsError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setRecommendationsLoading(false);
        }
      }
    };

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [campaign, campaignInfluencers]);

  const handleAddRecommendedInfluencer = async (accountId: number) => {
    if (!campaign?.id) return;
    if (!userId) {
      setRecommendationsError("ログインしてから候補者を追加してね。");
      return;
    }

    const recommended = recommendedInfluencers.find((influencer) => influencer.id === accountId);
    if (!recommended) return;

    setAddingRecommendedAccountId(accountId);
    setRecommendationsError(null);

    try {
      await addCampaignInfluencerRelation({
        campaignId: campaign.id,
        accountId,
      });
      await reloadInfluencers();
    } catch (error) {
      setRecommendationsError(error instanceof Error ? error.message : String(error));
    } finally {
      setAddingRecommendedAccountId(null);
    }
  };

  return {
    recommendedInfluencers,
    recommendationsLoading,
    recommendationsError,
    addingRecommendedAccountId,
    handleAddRecommendedInfluencer,
  };
};
