import type { InfluencerAverageCommentAnalysis } from "../types";
import { formatDateYmd, formatPercent, formatScore } from "../logic/formatters";
import {
  TOPIC_CHART_COLORS,
  buildPieGradient,
  topEntries,
  topicChartEntries,
} from "../logic/commentAnalysis";

type CommentAnalysisPanelProps = {
  averageAnalysis: InfluencerAverageCommentAnalysis | null;
  analysisError: string | null;
};

export function CommentAnalysisPanel({ averageAnalysis, analysisError }: CommentAnalysisPanelProps) {
  return (
    <section>
      <div className="deco-label mb-3">コメント分析</div>
      {analysisError && (
        <p className="border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">
          分析データの取得に失敗しました: {analysisError}
        </p>
      )}
      {!analysisError && !averageAnalysis && (
        <p className="text-sm text-muted-foreground">平均コメント分析データがありません。</p>
      )}
      {averageAnalysis && (
        <div className="deco-panel mt-4 space-y-4">
          {(() => {
            const avgTopicEntries = topicChartEntries(averageAnalysis.avg_topics);
            const avgLanguageEntries = topEntries(averageAnalysis.avg_language);
            const avgEmotionEntries = topicChartEntries(averageAnalysis.avg_emotion);

            return (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">平均コメント分析</div>
                    <div className="text-xs text-muted-foreground">
                      更新: {formatDateYmd(averageAnalysis.updated_at)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                  <div className="deco-stat">
                    <div className="deco-label">対象件数</div>
                    <div>分析投稿数: {averageAnalysis.posts_count ?? "未設定"}</div>
                    <div>収集コメント合計: {averageAnalysis.sum_sampled_total ?? "未設定"}</div>
                    <div>分析コメント合計: {averageAnalysis.sum_filtered_total ?? "未設定"}</div>
                    <div>平均スパム率: {formatPercent(averageAnalysis.avg_spam_rate)}</div>
                  </div>

                  <div className="deco-stat">
                    <div className="deco-label">感情・安全性</div>
                    <div>平均感情: {formatScore(averageAnalysis.avg_sentiment)}</div>
                    <div>平均Toxicity: {formatScore(averageAnalysis.avg_toxicity)}</div>
                    <div>平均Hate: {formatScore(averageAnalysis.avg_hate_score)}</div>
                  </div>

                  <div className="deco-stat">
                    <div className="deco-label">反応傾向</div>
                    <div>平均購買意図: {formatPercent(averageAnalysis.avg_conversion_intent_rate)}</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <PieSummary title="平均トピック" entries={avgTopicEntries} />

                  <div className="deco-stat text-sm text-muted-foreground">
                    <div className="deco-label">平均言語分布</div>
                    {avgLanguageEntries.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {avgLanguageEntries.map(([key, value]) => (
                          <span key={key} className="deco-chip">
                            {key}: {formatPercent(Number(value))}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2">なし</div>
                    )}
                  </div>
                </div>

                <PieSummary title="平均感情分布" entries={avgEmotionEntries} />
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}

function PieSummary({ title, entries }: { title: string; entries: Array<[string, number]> }) {
  return (
    <div className="deco-stat text-sm text-muted-foreground">
      <div className="deco-label">{title}</div>
      {entries.length ? (
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="deco-avatar h-40 w-40 shrink-0 rounded-full"
            style={{ background: buildPieGradient(entries) }}
            aria-label={`${title} pie chart`}
            title={title}
          />
          <div className="grid gap-2">
            {entries.map(([key, value], index) => (
              <div key={key} className="flex items-center gap-2 text-xs text-foreground">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: TOPIC_CHART_COLORS[index % TOPIC_CHART_COLORS.length] }}
                />
                <span>{key}</span>
                <span className="text-muted-foreground">{formatPercent(Number(value))}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2">なし</div>
      )}
    </div>
  );
}
