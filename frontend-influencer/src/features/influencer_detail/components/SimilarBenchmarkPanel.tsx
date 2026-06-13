import type { SimilarBenchmark } from "../types";
import { benchmarkLabel } from "../logic/similarBenchmark";

type SimilarBenchmarkPanelProps = {
  similarBenchmark: SimilarBenchmark | null;
};

export function SimilarBenchmarkPanel({ similarBenchmark }: SimilarBenchmarkPanelProps) {
  return (
    <section className="border border-slate-200 bg-white p-5 shadow-[0_18px_70px_-58px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="deco-label">類似アカウント比較</div>
          <h3 className="mt-3 text-2xl font-black uppercase tracking-[0.1em] text-slate-950">
            同カテゴリベンチマーク
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            同じプラットフォームでキーワードが重なるアカウントと比較し、各指標がどの位置にあるかを表示します。
          </p>
        </div>

        {similarBenchmark ? (
          <div className="w-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-4 lg:w-64">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              総合順位
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black text-slate-950">
                上位{similarBenchmark.overallTopPercent}%
              </span>
            </div>
            <div className="mt-2 text-sm font-black text-[#046307]">
              {benchmarkLabel(similarBenchmark.overallTopPercent)}
            </div>
            <div className="mt-2 text-xs text-slate-600">
              比較対象: {similarBenchmark.sampleSize}件
            </div>
          </div>
        ) : (
          <div className="w-full border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 lg:w-72">
            類似アカウントがまだ十分に見つかりません。
          </div>
        )}
      </div>

      {similarBenchmark && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {similarBenchmark.metrics.map((metric) => (
            <div key={metric.label} className="border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                    {metric.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {metric.sampleSize}件中 {metric.rank}位
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-950">
                    上位{metric.topPercent}%
                  </div>
                  <div className="text-xs font-black text-[#046307]">
                    {benchmarkLabel(metric.topPercent)}
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden bg-white">
                <div className="h-full bg-[#046307]" style={{ width: `${metric.percentile}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>低い</span>
                <span>上位</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
