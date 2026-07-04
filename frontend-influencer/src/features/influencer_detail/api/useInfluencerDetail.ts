import { useEffect, useMemo, useState } from "react";
import type {
  InfluencerAverageCommentAnalysis,
  InfluencerDetail,
  PostActivityRow,
  PostActivitySummary,
  RefreshJobRun,
  SimilarBenchmark,
  TrendData,
} from "../types";
import { dataFreshness } from "../logic/dataFreshness";
import { mostRecentTimestamp } from "../logic/formatters";
import {
  SCORE_BENCHMARKS,
  calculateWeightedInfluencerScore,
  commentQualityScore,
  freshnessScore,
  normalizeLinearScore,
  normalizeLogScore,
} from "../logic/influencerScore";
import { buildRiskSummary } from "../logic/riskSummary";
import {
  buildSimilarBenchmark,
  hasSharedKeyword,
  latestMetricRow,
} from "../logic/similarBenchmark";
import {
  buildPostingActivityTrend,
  emptyTrendData,
  normalizeMetricTrend,
  summarizePostActivity,
} from "../logic/trendData";
import { isActiveRefreshStatus } from "../logic/refreshJobs";
import {
  fetchAnalysisForAccounts,
  fetchAverageCommentAnalysis,
  fetchInfluencerDetail,
  fetchLatestRefreshJob,
  fetchMetricTrend,
  fetchPostActivityRows,
  fetchPostsForAccounts,
  fetchSimilarInfluencers,
  requestInfluencerRefresh,
} from "./influencerQueries";

export const useInfluencerDetail = (id: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [influencer, setInfluencer] = useState<InfluencerDetail | null>(null);
  const [averageAnalysis, setAverageAnalysis] = useState<InfluencerAverageCommentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [postActivity, setPostActivity] = useState<PostActivitySummary | null>(null);
  const [trendData, setTrendData] = useState<TrendData>(() => emptyTrendData());
  const [similarBenchmark, setSimilarBenchmark] = useState<SimilarBenchmark | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshJob, setRefreshJob] = useState<RefreshJobRun | null>(null);
  const [refreshJobError, setRefreshJobError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const latestMetrics = useMemo(() => {
    const rows = influencer?.accounts_metrics;
    return latestMetricRow(rows);
  }, [influencer]);

  useEffect(() => {
    let cancelled = false;

    const loadInfluencer = async () => {
      if (!id) {
        if (!cancelled) {
          setError("IDが見つからないよ。");
          setLoading(false);
        }
        return;
      }

      const influencerId = Number(id);
      if (Number.isNaN(influencerId)) {
        if (!cancelled) {
          setError("IDの形式が正しくないよ。");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
        setAnalysisError(null);
        setAverageAnalysis(null);
        setPostActivity(null);
        setTrendData(emptyTrendData());
        setSimilarBenchmark(null);
        setRefreshJobError(null);
      }

      try {
        const currentInfluencer = await fetchInfluencerDetail(influencerId);
        if (cancelled) return;

        setInfluencer(currentInfluencer);

        const [metricTrendRows, analysisResult, posts, latestRefreshJob] = await Promise.all([
          fetchMetricTrend(influencerId).catch(() => []),
          fetchAverageCommentAnalysis(influencerId)
            .then((analysis) => ({ analysis, error: null }))
            .catch((analysisFetchError) => ({
              analysis: null,
              error:
                analysisFetchError instanceof Error
                  ? analysisFetchError.message
                  : String(analysisFetchError),
            })),
          fetchPostActivityRows(influencerId).catch(() => []),
          fetchLatestRefreshJob(influencerId).catch((jobError) => {
            if (!cancelled) {
              setRefreshJobError(
                jobError instanceof Error ? jobError.message : String(jobError)
              );
            }
            return null;
          }),
        ]);

        if (cancelled) return;

        setAverageAnalysis(analysisResult.analysis);
        setAnalysisError(analysisResult.error);
        setRefreshJob(latestRefreshJob);

        const analysis = analysisResult.analysis;
        const currentPostSummary = summarizePostActivity(posts);
        setPostActivity(currentPostSummary);
        setTrendData({
          accountMetricTrend: normalizeMetricTrend(metricTrendRows),
          postingActivityTrend: buildPostingActivityTrend(posts),
        });

        if (currentInfluencer) {
          const similarInfluencers = (await fetchSimilarInfluencers(currentInfluencer, influencerId))
            .filter((similar) => hasSharedKeyword(currentInfluencer.keywords, similar.keywords))
            .slice(0, 50);
          if (cancelled) return;

          const similarIds = similarInfluencers.map((similar) => similar.id);
          const [similarPosts, similarAnalyses] = await Promise.all([
            fetchPostsForAccounts(similarIds).catch(() => []),
            fetchAnalysisForAccounts(similarIds).catch(() => []),
          ]);
          if (cancelled) return;

          const postsByAccount = new Map<number, PostActivityRow[]>();
          similarPosts.forEach((post) => {
            const postsForAccount = postsByAccount.get(post.account_id) ?? [];
            postsForAccount.push(post);
            postsByAccount.set(post.account_id, postsForAccount);
          });

          const similarPostActivity = new Map(
            Array.from(postsByAccount.entries()).map(([accountId, accountPosts]) => [
              accountId,
              summarizePostActivity(accountPosts),
            ])
          );
          const similarAnalysis = new Map(similarAnalyses.map((item) => [item.account_id, item]));
          const currentMetrics = latestMetricRow(currentInfluencer.accounts_metrics);
          const currentScore = calculateWeightedInfluencerScore({
            metrics: currentMetrics,
            latestPostedAt: currentPostSummary.latest_posted_at,
            postingSpanDays: currentPostSummary.posting_span_days,
            analysis,
          });

          setSimilarBenchmark(
            buildSimilarBenchmark({
              currentMetrics,
              currentScore,
              currentPostActivity: currentPostSummary,
              currentAnalysis: analysis,
              similarInfluencers,
              similarPostActivity,
              similarAnalysis,
            })
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          setInfluencer(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInfluencer();

    return () => {
      cancelled = true;
    };
  }, [id, refreshTick]);

  useEffect(() => {
    if (!influencer?.id || !isActiveRefreshStatus(refreshJob?.status)) return;

    const maxPollingMs = 5 * 60 * 1000;
    const maxFailedChecks = 3;
    const pollStartedAt = Date.now();
    let failedChecks = 0;

    const intervalId = window.setInterval(async () => {
      if (Date.now() - pollStartedAt >= maxPollingMs) {
        window.clearInterval(intervalId);
        setRefreshJobError("更新状況の確認を終了しました。必要なら再読み込みしてください。");
        return;
      }

      try {
        const nextJob = await fetchLatestRefreshJob(influencer.id);
        setRefreshJob(nextJob);
        setRefreshJobError(null);
        failedChecks = 0;

        if (nextJob?.status === "completed") {
          window.clearInterval(intervalId);
          setRefreshMessage("最新データを取得しました。画面を更新しています...");
          setRefreshTick((value) => value + 1);
        } else if (nextJob?.status === "failed") {
          window.clearInterval(intervalId);
          setRefreshError(nextJob.error_message ?? "更新ジョブが失敗しました。");
        }
      } catch (jobError) {
        failedChecks += 1;
        setRefreshJobError(jobError instanceof Error ? jobError.message : String(jobError));
        if (failedChecks >= maxFailedChecks) {
          window.clearInterval(intervalId);
        }
      }
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [influencer?.id, refreshJob?.status]);

  const keywordList =
    typeof influencer?.keywords === "string"
      ? influencer.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const freshestDate = mostRecentTimestamp(
    latestMetrics?.metric_date,
    postActivity?.latest_activity_at,
    postActivity?.latest_posted_at,
    influencer?.last_profile_scraped_at,
    averageAnalysis?.updated_at,
  );
  const freshness = dataFreshness(freshestDate);

  const influencerScore = useMemo(() => {
    const breakdown = [
      {
        label: "オーディエンス規模",
        value: normalizeLogScore(latestMetrics?.followers, SCORE_BENCHMARKS.followers),
        weight: 25,
      },
      {
        label: "最大反応力",
        value: normalizeLogScore(latestMetrics?.maximum_likes, SCORE_BENCHMARKS.maximumLikes),
        weight: 20,
      },
      {
        label: "投稿量",
        value: normalizeLinearScore(latestMetrics?.posts, SCORE_BENCHMARKS.posts),
        weight: 15,
      },
      {
        label: "最新投稿日",
        value: freshnessScore(postActivity?.latest_posted_at),
        weight: 20,
      },
      {
        label: "投稿継続期間",
        value: normalizeLinearScore(postActivity?.posting_span_days, SCORE_BENCHMARKS.postingSpanDays),
        weight: 10,
      },
      {
        label: "コメント品質",
        value: commentQualityScore(averageAnalysis),
        weight: 10,
      },
    ];
    const score = Math.max(0, Math.min(100, Math.round(
      breakdown.reduce((sum, item) => sum + item.value * (item.weight / 100), 0)
    )));

    return { score, breakdown };
  }, [averageAnalysis, latestMetrics, postActivity]);

  const riskSummary = useMemo(
    () =>
      buildRiskSummary({
        metrics: latestMetrics,
        postActivity,
        averageAnalysis,
        influencerScore: influencerScore.score,
        freshestDate,
        similarBenchmark,
      }),
    [averageAnalysis, freshestDate, influencerScore.score, latestMetrics, postActivity, similarBenchmark]
  );

  const handleRefreshInfluencer = async () => {
    if (!influencer?.id || refreshing) return;

    setRefreshing(true);
    setRefreshError(null);
    setRefreshMessage("最新データの取得をリクエストしています...");

    const { data, error } = await requestInfluencerRefresh(influencer.id);

    if (error) {
      const message = error.message || "更新リクエストに失敗しました。";
      setRefreshError(
        message.includes("Email verification required")
          ? "メール認証が完了したユーザーだけ更新を実行できます。"
          : message.includes("Refresh request limit exceeded")
            ? "短時間での更新リクエストが多すぎます。少し待ってから再試行してください。"
            : 
        message.includes("Failed to send a request")
          ? "Supabase Edge Function に接続できません。single-influencer-refresh がデプロイ済みか、CORS/Secrets が設定済みか確認してください。"
          : message
      );
      setRefreshMessage(null);
      setRefreshing(false);
      return;
    }

    const status = (data as { status?: string; message?: string } | null)?.status;
    if (status === "completed") {
      setRefreshMessage("最新データを取得しました。画面を更新しています...");
      setRefreshTick((value) => value + 1);
    } else if (status === "already_queued") {
      setRefreshMessage("このアカウントはすでに更新待ち、または更新中です。現在のジョブ状況を確認してください。");
    } else {
      setRefreshMessage(
        (data as { message?: string } | null)?.message ??
          "更新リクエストを受け付けました。バックグラウンドで取得されます。"
      );
    }

    try {
      setRefreshJob(await fetchLatestRefreshJob(influencer.id));
      setRefreshJobError(null);
    } catch (jobError) {
      setRefreshJobError(jobError instanceof Error ? jobError.message : String(jobError));
    }

    setRefreshing(false);
  };

  return {
    loading,
    error,
    influencer,
    averageAnalysis,
    analysisError,
    postActivity,
    trendData,
    similarBenchmark,
    refreshing,
    refreshMessage,
    refreshError,
    refreshJob,
    refreshJobError,
    latestMetrics,
    keywordList,
    freshestDate,
    freshness,
    influencerScore,
    riskSummary,
    handleRefreshInfluencer,
  };
};
