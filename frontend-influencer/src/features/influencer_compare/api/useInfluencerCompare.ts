import { useEffect, useMemo, useState } from "react";
import type { InfluencerCompareRow } from "../types";
import {
  bestDateByMetric,
  bestValueByMetric,
  buildComparisonMetrics,
} from "../logic/compareMetrics";
import { fetchInfluencersForCompare } from "./influencerCompareQueries";

export const parseCompareIds = (rawIds: string | null) =>
  (rawIds ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 5);

export const useInfluencerCompare = (rawIds: string | null) => {
  const ids = useMemo(() => parseCompareIds(rawIds), [rawIds]);
  const [influencers, setInfluencers] = useState<InfluencerCompareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInfluencers = async () => {
      if (ids.length < 2) {
        setInfluencers([]);
        setError("比較するには2人以上の候補者を選択してください。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        setInfluencers(await fetchInfluencersForCompare(ids));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        setInfluencers([]);
      } finally {
        setLoading(false);
      }
    };

    loadInfluencers();
  }, [ids]);

  const metrics = useMemo(() => buildComparisonMetrics(influencers), [influencers]);
  const bestValues = useMemo(() => bestValueByMetric(metrics), [metrics]);
  const bestDates = useMemo(() => bestDateByMetric(metrics), [metrics]);

  return {
    ids,
    influencers,
    loading,
    error,
    metrics,
    bestValues,
    bestDates,
  };
};
