import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { calculateWeightedInfluencerScore } from "@/features/influencer_detail/logic/influencerScore";
import type { InfluencerAverageCommentAnalysis } from "@/features/influencer_detail/types";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type MetricsRow = {
  maximum_likes: number | null;
  posts: number | null;
  followers: number | null;
  metric_date?: string | null;
};

type User = {
  id: number | string;
  profile_id: string | null;
  account_name: string;
  platform: string;
  account_url: string;
  caption: string | null;
  keywords: string | null;
  is_verified: string | null;
  profile_image_url: string | undefined;
  accounts_metrics?: MetricsRow[] | null;
  influencer_score?: number;
};

type PostActivityRow = {
  account_id: number;
  posted_at: string | null;
  scraped_at: string | null;
};

type AverageCommentAnalysisRow = {
  account_id: number;
  avg_sentiment: number | null;
  avg_toxicity: number | null;
  avg_spam_rate: number | null;
};

const toAverageAnalysis = (
  accountId: number,
  analysis: AverageCommentAnalysisRow | null | undefined
): InfluencerAverageCommentAnalysis | null => {
  if (!analysis) return null;

  return {
    account_id: accountId,
    window: "all_posts",
    posts_count: null,
    avg_sentiment: analysis.avg_sentiment,
    avg_toxicity: analysis.avg_toxicity,
    avg_hate_score: null,
    avg_conversion_intent_rate: null,
    avg_spam_rate: analysis.avg_spam_rate,
    sum_sampled_total: null,
    sum_filtered_total: null,
    avg_emotion: null,
    avg_language: null,
    avg_topics: null,
    updated_at: null,
  };
};

const timestampToMs = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const daysBetween = (start: string | null | undefined, end: string | null | undefined) => {
  const startMs = timestampToMs(start);
  const endMs = timestampToMs(end);
  if (startMs === Number.NEGATIVE_INFINITY || endMs === Number.NEGATIVE_INFINITY) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
};

const latestMetrics = (user: User) =>
  Array.isArray(user.accounts_metrics) && user.accounts_metrics.length > 0
    ? user.accounts_metrics[0]
    : null;

export function HomeScreen() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchHighScoreInfluencers = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      const { data, error: fetchError } = await supabase
        .from("sns_accounts")
        .select(
          `
          id,
          profile_id,
          account_name,
          platform,
          account_url,
          caption,
          keywords,
          is_verified,
          profile_image_url,
          accounts_metrics(maximum_likes, posts, followers, metric_date)
        `
        )
        .order("metric_date", {
          foreignTable: "accounts_metrics",
          ascending: false,
        })
        .limit(100);

      if (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
          setUsers([]);
          setLoading(false);
        }
        return;
      }

      const accounts = (data as User[]) ?? [];
      const accountIds = accounts
        .map((account) => Number(account.id))
        .filter((accountId) => Number.isInteger(accountId) && accountId > 0);

      const [postsResponse, analysisResponse] = await Promise.all([
        accountIds.length
          ? supabase
              .from("posts")
              .select("account_id, posted_at, scraped_at")
              .in("account_id", accountIds)
          : Promise.resolve({ data: [], error: null }),
        accountIds.length
          ? supabase
              .from("influencer_average_comment_analysis")
              .select("account_id, avg_sentiment, avg_toxicity, avg_spam_rate")
              .in("account_id", accountIds)
              .eq("window", "all_posts")
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (cancelled) return;

      if (postsResponse.error) {
        setError(postsResponse.error.message);
        setUsers([]);
        setLoading(false);
        return;
      }

      if (analysisResponse.error) {
        setError(analysisResponse.error.message);
        setUsers([]);
        setLoading(false);
        return;
      }

      const activityByAccount = new Map<
        number,
        {
          latest_posted_at: string | null;
          first_posted_at: string | null;
          posting_span_days: number;
        }
      >();

      ((postsResponse.data as PostActivityRow[]) ?? []).forEach((post) => {
        const current = activityByAccount.get(post.account_id) ?? {
          latest_posted_at: null,
          first_posted_at: null,
          posting_span_days: 0,
        };

        if (
          post.posted_at &&
          (!current.latest_posted_at ||
            timestampToMs(post.posted_at) > timestampToMs(current.latest_posted_at))
        ) {
          current.latest_posted_at = post.posted_at;
        }

        if (
          post.posted_at &&
          (!current.first_posted_at ||
            timestampToMs(post.posted_at) < timestampToMs(current.first_posted_at))
        ) {
          current.first_posted_at = post.posted_at;
        }

        current.posting_span_days = daysBetween(current.first_posted_at, current.latest_posted_at);
        activityByAccount.set(post.account_id, current);
      });

      const analysisByAccount = new Map(
        ((analysisResponse.data as AverageCommentAnalysisRow[]) ?? []).map((row) => [
          row.account_id,
          row,
        ])
      );

      const scored = accounts
        .map((account) => {
          const metrics = latestMetrics(account);
          const accountId = Number(account.id);
          const activity = activityByAccount.get(accountId);
          const analysis = toAverageAnalysis(
            accountId,
            analysisByAccount.get(accountId) ?? null
          );
          const score = calculateWeightedInfluencerScore({
            metrics,
            latestPostedAt: activity?.latest_posted_at,
            postingSpanDays: activity?.posting_span_days,
            analysis,
          });

          return { ...account, influencer_score: score };
        })
        .sort((a, b) => (b.influencer_score ?? 0) - (a.influencer_score ?? 0))
        .slice(0, 10);

      if (!cancelled) {
        setUsers(scored);
        setLoading(false);
      }
    };

    fetchHighScoreInfluencers();

    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="deco-page flex flex-col gap-6">
      <div className="deco-hero">
        <div className="deco-kicker">候補アカウント</div>
        <div className="section-title font-display mt-3">トップスコア候補</div>
        <div className="section-subtitle">インフルエンサースコアが高い順に、上位10人の候補者を表示します。</div>
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}

      {!loading && users.length > 0 && (
        <div className="space-y-4">
          <h2 className="section-title">スコア上位10人</h2>
          <Carousel opts={{ align: "start" }} className="w-full px-12">
            <CarouselContent>
              {(() => {
                const base = users.slice(0, 10);
                const items = [...base, { id: "__search_more__" } as User];
                const chunks: User[][] = [];
                for (let i = 0; i < items.length; i += 6) {
                  chunks.push(items.slice(i, i + 6));
                }
                return chunks.map((chunk, pageIndex) => (
                  <CarouselItem
                    key={`page-${pageIndex}`}
                    className="basis-full"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {chunk.map((user) => {
                        if (user.id === "__search_more__") {
                          return (
                            <Card
                              key="search-more"
                              className="deco-motion cursor-pointer border-dashed"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate("/search/search")}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  navigate("/search/search");
                                }
                              }}
                            >
                              <CardHeader>
                                <CardTitle className="text-lg font-display">
                                  もっと検索
                                </CardTitle>
                                <CardDescription>
                                  条件を変えて探してみよう。
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="text-sm text-muted-foreground">
                                クリックして検索ページへ
                              </CardContent>
                            </Card>
                          );
                        }

                        return (
                          <Card
                            key={user.id}
                            className="deco-motion cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              navigate(`/search/influencer/${user.id}`)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(`/search/influencer/${user.id}`);
                              }
                            }}
                          >
                            <CardHeader>
                              <CardTitle className="text-lg font-display flex items-center justify-between gap-3">
                                <span className="truncate">
                                  {user.account_name}
                                </span>
                                {user.profile_image_url ? (
                                  <img
                                    src={user.profile_image_url}
                                    alt={`${user.account_name} profile`}
                                    className="deco-avatar h-14 w-14 shrink-0 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                              </CardTitle>
                              <CardDescription className="line-clamp-1">
                                {user.platform}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex w-fit items-center gap-2 border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-xs font-black text-slate-900">
                                <span>スコア</span>
                                <span>{user.influencer_score ?? "未設定"}</span>
                              </div>
                              <p className="deco-chip">
                                キーワード: {user.keywords ?? "なし"}
                              </p>
                              <p className="deco-copy line-clamp-2 text-sm">
                                {user.caption ?? "自己紹介がまだないよ。"}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CarouselItem>
                ));
              })()}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        </div>
      )}
      {!loading && !error && users.length === 0 && (
        <div className="deco-panel text-sm text-muted-foreground">
          表示できるインフルエンサーはまだ見つかりません。
        </div>
      )}
    </div>
  );
}
