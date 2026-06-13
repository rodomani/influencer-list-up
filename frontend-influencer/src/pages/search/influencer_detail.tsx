import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { useInfluencerDetail } from "@/features/influencer_detail/api/useInfluencerDetail";
import { CommentAnalysisPanel } from "@/features/influencer_detail/components/CommentAnalysisPanel";
import { DataFreshnessPanel } from "@/features/influencer_detail/components/DataFreshnessPanel";
import { InfluencerDetailsPanel } from "@/features/influencer_detail/components/InfluencerDetailsPanel";
import { InfluencerScorePanel } from "@/features/influencer_detail/components/InfluencerScorePanel";
import { RawMetricsPanel } from "@/features/influencer_detail/components/RawMetricsPanel";
import { RiskSummaryPanel } from "@/features/influencer_detail/components/RiskSummaryPanel";
import { SimilarBenchmarkPanel } from "@/features/influencer_detail/components/SimilarBenchmarkPanel";
import { TrendChartsPanel } from "@/features/influencer_detail/components/TrendChartsPanel";

export function InfluencerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useInfluencerDetail(id);

  const {
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
  } = detail;

  return (
    <div className="deco-page flex flex-col gap-6">
      <div className="deco-hero flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="deco-kicker">詳細資料</div>
          <div className="section-title font-display mt-3">インフルエンサー詳細</div>
          <div className="section-subtitle">連絡前に情報をチェックしよう。</div>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          戻る
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}
      {!loading && !error && !influencer && (
        <p className="text-sm text-muted-foreground">見つからなかったよ。</p>
      )}

      {!loading && !error && influencer && (
        <div className="deco-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full space-y-8 lg:max-w-5xl">
              <div>
                <CardTitle className="pb-2 font-display">
                  {influencer.account_name}
                </CardTitle>
                <div className="deco-chip mt-2 w-fit">{influencer.platform}</div>
              </div>

              <InfluencerScorePanel
                score={influencerScore.score}
                breakdown={influencerScore.breakdown}
                postActivity={postActivity}
                similarBenchmark={similarBenchmark}
              />

              <SimilarBenchmarkPanel similarBenchmark={similarBenchmark} />

              <InfluencerDetailsPanel influencer={influencer} keywordList={keywordList} />

              <DataFreshnessPanel
                freshness={freshness}
                freshestDate={freshestDate}
                latestMetrics={latestMetrics}
                postActivity={postActivity}
                profileUpdatedAt={influencer.last_profile_scraped_at}
                refreshing={refreshing}
                refreshJob={refreshJob}
                refreshJobError={refreshJobError}
                refreshMessage={refreshMessage}
                refreshError={refreshError}
                onRefresh={handleRefreshInfluencer}
              />

              <RawMetricsPanel latestMetrics={latestMetrics} />

              <RiskSummaryPanel riskSummary={riskSummary} />

              <TrendChartsPanel trendData={trendData} />

              {influencer.caption && (
                <section className="deco-stat">
                  <div className="deco-label">自己紹介</div>
                  <p className="deco-copy mt-3 whitespace-pre-wrap text-sm">
                    {influencer.caption}
                  </p>
                </section>
              )}

              <CommentAnalysisPanel
                averageAnalysis={averageAnalysis}
                analysisError={analysisError}
              />
            </div>

            <div className="flex w-full flex-col items-end gap-4 lg:w-auto lg:min-w-[200px]">
              {influencer.profile_image_url ? (
                <img
                  src={influencer.profile_image_url}
                  alt={`${influencer.account_name} profile`}
                  className="deco-avatar h-28 w-28 shrink-0 rounded-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
