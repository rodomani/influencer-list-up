import type { PostActivitySummary, ScoreBreakdown, SimilarBenchmark } from "../types";
import { formatDateYmd, formatDays } from "../logic/formatters";

type InfluencerScorePanelProps = {
  score: number;
  breakdown: ScoreBreakdown[];
  postActivity: PostActivitySummary | null;
  similarBenchmark: SimilarBenchmark | null;
};

export function InfluencerScorePanel({
  score,
  breakdown,
  postActivity,
  similarBenchmark,
}: InfluencerScorePanelProps) {
  return (
    <section className="border border-slate-200 bg-white p-5 shadow-[0_18px_70px_-58px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="deco-label">インフルエンサースコア</div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="text-6xl font-black leading-none tracking-[0.02em] text-slate-950">
              {score}
            </div>
            <div className="pb-1 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
              / 100
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            フォロワー数、最大いいね数、投稿量、最新投稿日、投稿継続期間、コメント品質から算出しています。
          </p>
          {similarBenchmark && (
            <p className="mt-2 text-sm font-medium text-slate-600">
              類似アカウント比較データ: {similarBenchmark.sampleSize}件 / 総合スコア 上位{similarBenchmark.overallTopPercent}%
            </p>
          )}
        </div>

        <div className="w-full lg:w-64">
          <div className="h-3 w-full overflow-hidden bg-slate-100">
            <div className="h-full bg-[#046307]" style={{ width: `${score}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div>最新投稿日: {formatDateYmd(postActivity?.latest_posted_at ?? null)}</div>
            <div>活動日: {formatDateYmd(postActivity?.latest_activity_at ?? null)}</div>
            <div>初回投稿: {formatDateYmd(postActivity?.first_posted_at ?? null)}</div>
            <div>継続: {formatDays(postActivity?.posting_span_days)}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {breakdown.map((item) => (
          <div key={item.label} className="border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {item.label}
              </div>
              <div className="text-xs font-black text-[#D4AF37]">{item.weight}%</div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="min-w-10 text-lg font-black text-slate-950">{item.value}</div>
              <div className="h-2 flex-1 overflow-hidden bg-white">
                <div className="h-full bg-[#D4AF37]" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
