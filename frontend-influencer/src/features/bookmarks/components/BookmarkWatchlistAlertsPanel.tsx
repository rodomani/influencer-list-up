import type { BookmarkedInfluencer } from "../types";
import {
  bookmarkAlertClassName,
  buildBookmarkWatchlistSummary,
} from "../logic/bookmarkWatchlistAlerts";

type BookmarkWatchlistAlertsPanelProps = {
  influencers: BookmarkedInfluencer[];
  loading: boolean;
};

export function BookmarkWatchlistAlertsPanel({
  influencers,
  loading,
}: BookmarkWatchlistAlertsPanelProps) {
  if (loading || influencers.length === 0) return null;

  const summary = buildBookmarkWatchlistSummary(influencers);
  const topRows = summary.rows
    .filter((row) => row.alerts.length > 0)
    .sort((a, b) => {
      const severityScore = (alerts: typeof a.alerts) =>
        alerts.reduce((sum, alert) => {
          if (alert.severity === "high") return sum + 3;
          if (alert.severity === "medium") return sum + 2;
          return sum + 1;
        }, 0);

      return severityScore(b.alerts) - severityScore(a.alerts);
    })
    .slice(0, 4);

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">ウォッチリストアラート</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            要確認候補
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            投稿停止、古いデータ、成長変化、活動停滞、指標不足をフロント側で自動検知します。
          </p>
        </div>
        <div className="border border-slate-200 bg-[#f9fafb] px-4 py-3 text-right">
          <p className="deco-label">アラート</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{summary.totalAlerts}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="deco-stat min-w-0">
          <p className="deco-label">対象候補</p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {summary.affectedInfluencers}
          </p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">高</p>
          <p className="mt-2 text-2xl font-black text-red-700">{summary.highAlerts}</p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">中</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary.mediumAlerts}</p>
        </div>
        <div className="deco-stat min-w-0">
          <p className="deco-label">正常</p>
          <p className="mt-2 text-2xl font-black text-[#046307]">
            {Math.max(0, influencers.length - summary.affectedInfluencers)}
          </p>
        </div>
      </div>

      {topRows.length > 0 ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {topRows.map((row) => (
            <article key={row.influencer.id} className="border border-slate-200 bg-[#f9fafb] p-4">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-950">
                {row.influencer.account_name}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.alerts.slice(0, 3).map((alert) => (
                  <span
                    key={alert.id}
                    className={`border px-2.5 py-1 text-xs font-black ${bookmarkAlertClassName(alert.severity)}`}
                    title={alert.description}
                  >
                    {alert.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 border border-slate-200 bg-[#f9fafb] p-4 text-sm text-muted-foreground">
          現在、要確認のブックマークはありません。
        </p>
      )}
    </section>
  );
}
