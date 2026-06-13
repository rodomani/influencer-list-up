import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendData } from "../types";
import {
  formatChartDate,
  formatChartMonth,
  formatCompactNumber,
  formatDateYmd,
} from "../logic/formatters";

type TrendChartsPanelProps = {
  trendData: TrendData;
};

export function TrendChartsPanel({ trendData }: TrendChartsPanelProps) {
  return (
    <section>
      <div className="deco-label mb-3">トレンド分析</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="border border-slate-200 bg-white p-5 shadow-[0_18px_70px_-58px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
                フォロワー推移
              </div>
              <p className="mt-2 text-sm text-slate-500">
                保存されている指標履歴からフォロワー数の変化を表示します。
              </p>
            </div>
            <div className="text-xs font-black text-slate-500">
              {trendData.accountMetricTrend.length}件
            </div>
          </div>

          {trendData.accountMetricTrend.length > 1 ? (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData.accountMetricTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="followersTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#046307" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#046307" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCompactNumber}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => [formatCompactNumber(Number(value)), "フォロワー"]}
                    labelFormatter={(label) => formatDateYmd(String(label))}
                    contentStyle={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 0,
                      boxShadow: "0 18px 50px -34px rgba(15,23,42,0.5)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="followers"
                    stroke="#046307"
                    strokeWidth={2}
                    fill="url(#followersTrendFill)"
                    dot={{ r: 3, stroke: "#D4AF37", strokeWidth: 1, fill: "#ffffff" }}
                    activeDot={{ r: 5, stroke: "#D4AF37", strokeWidth: 2, fill: "#046307" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-5 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              フォロワー推移を描画するには、2件以上の指標履歴が必要です。
            </p>
          )}
        </div>

        <div className="border border-slate-200 bg-white p-5 shadow-[0_18px_70px_-58px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">
                月別投稿数
              </div>
              <p className="mt-2 text-sm text-slate-500">
                取得済み投稿の投稿日を月単位で集計して、投稿ペースを表示します。
              </p>
            </div>
            <div className="text-xs font-black text-slate-500">
              {trendData.postingActivityTrend.length}ヶ月
            </div>
          </div>

          {trendData.postingActivityTrend.length > 0 ? (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.postingActivityTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartMonth}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    formatter={(value) => [`${new Intl.NumberFormat("ja-JP").format(Number(value))}件`, "投稿数"]}
                    labelFormatter={(label) => `${formatChartMonth(String(label))}`}
                    contentStyle={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 0,
                      boxShadow: "0 18px 50px -34px rgba(15,23,42,0.5)",
                    }}
                  />
                  <Bar dataKey="posts" fill="#D4AF37" radius={[0, 0, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-5 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              月別投稿数を描画できる投稿データがまだありません。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
