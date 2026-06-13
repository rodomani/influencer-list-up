import { useEffect, useMemo, useState } from "react";
import type { CampaignCompareRow } from "../types";
import {
  bestDateByMetric,
  bestValueByMetric,
  buildCampaignCompareMetrics,
  parseCampaignCompareIds,
} from "../logic/campaignCompareFormatters";
import { buildCampaignCompareRecommendation } from "../logic/campaignCompareRecommendations";
import { fetchCampaignsForCompare } from "./campaignCompareQueries";

export const useCampaignCompare = (rawIds: string | null, userId: string | undefined) => {
  const ids = useMemo(() => parseCampaignCompareIds(rawIds), [rawIds]);
  const [campaigns, setCampaigns] = useState<CampaignCompareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!userId) {
        setError("ログインしてからキャンペーンを比較してね。");
        setCampaigns([]);
        setLoading(false);
        return;
      }

      if (ids.length < 2) {
        setError("比較するには2件以上のキャンペーンを選択してください。");
        setCampaigns([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        setCampaigns(await fetchCampaignsForCompare({ ids, userId }));
      } catch (fetchError) {
        setCampaigns([]);
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [ids, userId]);

  const metrics = useMemo(() => buildCampaignCompareMetrics(campaigns), [campaigns]);
  const bestValues = useMemo(() => bestValueByMetric(metrics), [metrics]);
  const bestDates = useMemo(() => bestDateByMetric(metrics), [metrics]);
  const recommendation = useMemo(
    () => buildCampaignCompareRecommendation(campaigns),
    [campaigns]
  );

  return {
    ids,
    campaigns,
    loading,
    error,
    metrics,
    bestValues,
    bestDates,
    recommendation,
  };
};
