import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type MetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

type InfluencerDetail = {
  id: number;
  platform: string;
  account_name: string;
  account_url: string | null;
  caption: string | null;
  profile_image_url: string | null;
  gender: string | null;
  keywords: string | null;
  accounts_metrics?: MetricsRow[] | null;
  last_profile_scraped_at: string | null;
};

type InfluencerAverageCommentAnalysis = {
  account_id: number;
  window: string;
  posts_count: number | null;
  avg_sentiment: number | null;
  avg_toxicity: number | null;
  avg_hate_score: number | null;
  avg_conversion_intent_rate: number | null;
  avg_spam_rate: number | null;
  sum_sampled_total: number | null;
  sum_filtered_total: number | null;
  avg_emotion: Record<string, number> | null;
  avg_language: Record<string, number> | null;
  avg_topics: Record<string, number> | null;
  updated_at: string | null;
};

const formatDateYmd = (value: string | null) => {
  if (!value) return "N/A";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  const ymd = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return ymd.replace(/-/g, "/");
};

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== "number") return "N/A";
  return `${(value * 100).toFixed(1)}%`;
};

const formatScore = (value: number | null | undefined, digits = 2) => {
  if (typeof value !== "number") return "N/A";
  return value.toFixed(digits);
};

const topEntries = (value: Record<string, number> | null | undefined, limit = 5) =>
  Object.entries(value ?? {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, limit);

const TOPIC_CHART_COLORS = [
  "#7c3aed",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#84cc16",
];

const topicChartEntries = (
  value: Record<string, number> | null | undefined,
  limit = 5,
): Array<[string, number]> => {
  const entries = topEntries(value, limit);
  const total = Object.values(value ?? {}).reduce((sum, current) => sum + Number(current || 0), 0);
  const shown = entries.reduce((sum, [, current]) => sum + Number(current || 0), 0);
  const remainder = Math.max(total - shown, 0);
  return remainder > 0.0001 ? [...entries, ["その他", remainder]] : entries;
};

const buildPieGradient = (entries: Array<[string, number]>) => {
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (total <= 0) return "";

  let current = 0;
  return `conic-gradient(${entries
    .map(([, value], index) => {
      const start = current;
      current += (Number(value || 0) / total) * 360;
      return `${TOPIC_CHART_COLORS[index % TOPIC_CHART_COLORS.length]} ${start}deg ${current}deg`;
    })
    .join(", ")})`;
};

export function InfluencerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [influencer, setInfluencer] = useState<InfluencerDetail | null>(null);
  const [averageAnalysis, setAverageAnalysis] = useState<InfluencerAverageCommentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const latestMetrics = useMemo(() => {
    const rows = influencer?.accounts_metrics;
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }, [influencer]);

  useEffect(() => {
    const fetchInfluencer = async () => {
      if (!id) {
        setError("IDが見つからないよ。");
        setLoading(false);
        return;
      }

      const influencerId = Number(id);
      if (Number.isNaN(influencerId)) {
        setError("IDの形式が正しくないよ。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setAnalysisError(null);

      const influencerResponse = await supabase
        .from("sns_accounts")
        .select(
          `
          id,
          platform,
          account_name,
          account_url,
          caption,
          profile_image_url,
          gender,
          keywords,
          last_profile_scraped_at,
          accounts_metrics(maximum_likes, posts, followers, metric_date)
        `
        )
        .eq("id", influencerId)
        .order("metric_date", {
          foreignTable: "accounts_metrics",
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (influencerResponse.error) {
        setError(influencerResponse.error.message);
        setInfluencer(null);
      } else {
        setInfluencer((influencerResponse.data as InfluencerDetail) ?? null);
      }

      const analysisResponse = await supabase
        .from("influencer_average_comment_analysis")
        .select(
          `
          account_id,
          window,
          posts_count,
          avg_sentiment,
          avg_toxicity,
          avg_hate_score,
          avg_conversion_intent_rate,
          avg_spam_rate,
          sum_sampled_total,
          sum_filtered_total,
          avg_emotion,
          avg_language,
          avg_topics,
          updated_at
        `
        )
        .eq("account_id", influencerId)
        .eq("window", "all_posts")
        .maybeSingle();

      if (analysisResponse.error) {
        setAnalysisError(analysisResponse.error.message);
        setAverageAnalysis(null);
      } else {
        setAverageAnalysis((analysisResponse.data as InfluencerAverageCommentAnalysis) ?? null);
      }

      setLoading(false);
    };

    fetchInfluencer();
  }, [id]);

  const keywordList =
    typeof influencer?.keywords === "string"
      ? influencer.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-title font-display">インフルエンサー詳細</div>
          <div className="section-subtitle">連絡前に情報をチェックしよう。</div>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          戻る
        </Button>
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}
      {!loading && !error && !influencer && (
        <p className="text-sm text-muted-foreground">見つからなかったよ。</p>
      )}

      {!loading && !error && influencer && (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full space-y-8 lg:max-w-5xl">
              <div>
                <CardTitle className="pb-2 font-display">
                  {influencer.account_name}
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {influencer.platform}
                </div>
              </div>

              <section>
                <div className="font-medium text-foreground">詳細</div>
                <div className="text-sm text-muted-foreground">
                  <div>性別: {influencer.gender ?? "未設定"}</div>
                  <div>
                    キーワード:{" "}
                    {keywordList.length ? keywordList.join(", ") : "なし"}
                  </div>
                  <div>
                    プロフィールURL:{" "}
                    {influencer.account_url ? (
                      <a
                        href={influencer.account_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        {influencer.account_url}
                      </a>
                    ) : (
                      "未設定"
                    )}
                  </div>
                  <div>
                    Last Updated:{" "}
                    {formatDateYmd(influencer.last_profile_scraped_at)}
                  </div>
                </div>
              </section>

              <section>
                <div className="font-medium text-foreground">指標</div>
                <div className="text-sm text-muted-foreground">
                  <div>投稿数: {latestMetrics?.posts ?? "未設定"}</div>
                  <div>フォロワー: {latestMetrics?.followers ?? "未設定"}</div>
                  <div>
                    最大いいね: {latestMetrics?.maximum_likes ?? "未設定"}
                  </div>
                </div>
              </section>

              {influencer.caption && (
                <section>
                  <div className="font-medium text-foreground">自己紹介</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {influencer.caption}
                  </p>
                </section>
              )}

              <section>
                <div className="font-medium text-foreground">コメント分析</div>
                {analysisError && (
                  <p className="text-sm text-red-600">
                    分析データの取得に失敗しました: {analysisError}
                  </p>
                )}
                {!analysisError && !averageAnalysis && (
                  <p className="text-sm text-muted-foreground">
                    平均コメント分析データがありません。
                  </p>
                )}
                {averageAnalysis && (
                  <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                    {(() => {
                      const avgTopicEntries = topicChartEntries(averageAnalysis.avg_topics);
                      const avgLanguageEntries = topEntries(averageAnalysis.avg_language);
                      const avgEmotionEntries = topicChartEntries(averageAnalysis.avg_emotion);

                      return (
                        <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">
                          平均コメント分析
                        </div>
                        <div className="text-xs text-muted-foreground">
                          更新:{" "}
                          {formatDateYmd(averageAnalysis.updated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-lg bg-background/70 p-3">
                        <div className="font-medium text-foreground">対象件数</div>
                        <div>分析投稿数: {averageAnalysis.posts_count ?? "N/A"}</div>
                        <div>収集コメント合計: {averageAnalysis.sum_sampled_total ?? "N/A"}</div>
                        <div>分析コメント合計: {averageAnalysis.sum_filtered_total ?? "N/A"}</div>
                        <div>平均スパム率: {formatPercent(averageAnalysis.avg_spam_rate)}</div>
                      </div>

                      <div className="rounded-lg bg-background/70 p-3">
                        <div className="font-medium text-foreground">感情・安全性</div>
                        <div>平均感情: {formatScore(averageAnalysis.avg_sentiment)}</div>
                        <div>平均Toxicity: {formatScore(averageAnalysis.avg_toxicity)}</div>
                        <div>平均Hate: {formatScore(averageAnalysis.avg_hate_score)}</div>
                      </div>

                      <div className="rounded-lg bg-background/70 p-3">
                        <div className="font-medium text-foreground">反応傾向</div>
                        <div>
                          平均購買意図:{" "}
                          {formatPercent(averageAnalysis.avg_conversion_intent_rate)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-background/70 p-3 text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">平均トピック</div>
                        {avgTopicEntries.length ? (
                          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div
                              className="h-40 w-40 shrink-0 rounded-full border border-border/60"
                              style={{ background: buildPieGradient(avgTopicEntries) }}
                              aria-label="平均トピック pie chart"
                              title="平均トピック"
                            />
                            <div className="grid gap-2">
                              {avgTopicEntries.map(([key, value], index) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-2 text-xs text-foreground"
                                >
                                  <span
                                    className="h-3 w-3 rounded-sm"
                                    style={{
                                      backgroundColor:
                                        TOPIC_CHART_COLORS[index % TOPIC_CHART_COLORS.length],
                                    }}
                                  />
                                  <span>{key}</span>
                                  <span className="text-muted-foreground">
                                    {formatPercent(Number(value))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">なし</div>
                        )}
                      </div>

                      <div className="rounded-lg bg-background/70 p-3 text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">平均言語分布</div>
                        {avgLanguageEntries.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {avgLanguageEntries.map(([key, value]) => (
                              <span
                                key={key}
                                className="rounded-full bg-muted px-2 py-1 text-xs text-foreground"
                              >
                                {key}: {formatPercent(Number(value))}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2">なし</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-background/70 p-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">平均感情分布</div>
                      {avgEmotionEntries.length ? (
                        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div
                            className="h-40 w-40 shrink-0 rounded-full border border-border/60"
                            style={{ background: buildPieGradient(avgEmotionEntries) }}
                            aria-label="平均感情分布 pie chart"
                            title="平均感情分布"
                          />
                          <div className="grid gap-2">
                            {avgEmotionEntries.map(([key, value], index) => (
                              <div
                                key={key}
                                className="flex items-center gap-2 text-xs text-foreground"
                              >
                                <span
                                  className="h-3 w-3 rounded-sm"
                                  style={{
                                    backgroundColor:
                                      TOPIC_CHART_COLORS[index % TOPIC_CHART_COLORS.length],
                                  }}
                                />
                                <span>{key}</span>
                                <span className="text-muted-foreground">
                                  {formatPercent(Number(value))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">なし</div>
                      )}
                    </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </section>
            </div>
            <div className="flex w-full flex-col items-end gap-4 lg:w-auto lg:min-w-[200px]">
              {influencer.profile_image_url ? (
                <img
                  src={influencer.profile_image_url}
                  alt={`${influencer.account_name} profile`}
                  className="h-20 w-20 shrink-0 rounded-full object-cover"
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
