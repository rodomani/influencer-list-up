import type { BookmarkedInfluencer } from "../../types";
import {
  bookmarkAlertClassName,
  buildBookmarkWatchlistAlerts,
} from "../../logic/bookmarkWatchlistAlerts";

type BookmarkWatchlistAlertsSectionProps = {
  influencer: BookmarkedInfluencer;
};

export function BookmarkWatchlistAlertsSection({
  influencer,
}: BookmarkWatchlistAlertsSectionProps) {
  const alerts = buildBookmarkWatchlistAlerts(influencer);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="deco-label mr-1">アラート</span>
        {alerts.map((alert) => (
          <span
            key={alert.id}
            className={`max-w-full break-words border px-3 py-1.5 text-xs font-black ${bookmarkAlertClassName(alert.severity)}`}
            title={alert.description}
          >
            {alert.label}
          </span>
        ))}
      </div>
    </div>
  );
}
