import { Button } from "@/components/ui/button";
import type { BookmarkMetricsRow, BookmarkSavedSnapshot } from "../types";
import {
  formatBookmarkDate,
  formatBookmarkDateTime,
  formatBookmarkMetric,
} from "../logic/bookmarkFormatters";

type BookmarkSavedSnapshotProps = {
  snapshot: BookmarkSavedSnapshot | null;
  currentMetrics: BookmarkMetricsRow | null;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onCapture: () => Promise<boolean>;
};

const formatGrowthRate = (saved: number | null, current: number | null) => {
  if (typeof saved !== "number" || typeof current !== "number" || saved <= 0) {
    return "未設定";
  }

  const changeRate = ((current - saved) / saved) * 100;
  const prefix = changeRate >= 0 ? "+" : "";
  return `${prefix}${changeRate.toFixed(1)}%`;
};

export function BookmarkSavedSnapshot({
  snapshot,
  currentMetrics,
  updating,
  error,
  persistenceReady,
  onCapture,
}: BookmarkSavedSnapshotProps) {
  return (
    <div
      className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="deco-label">保存時スナップショット</p>
          <p className="mt-1 text-xs text-muted-foreground">
            保存時の主要指標と現在値を比較できます。
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updating || !persistenceReady}
          onClick={async () => {
            await onCapture();
          }}
        >
          {updating ? "保存中..." : snapshot ? "スナップショット更新" : "現在値を保存"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">保存時フォロワー数</p>
          <p className="mt-2 text-lg font-black text-slate-950">
            {formatBookmarkMetric(snapshot?.followers)}
          </p>
        </div>
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">現在フォロワー数</p>
          <p className="mt-2 text-lg font-black text-slate-950">
            {formatBookmarkMetric(currentMetrics?.followers)}
          </p>
        </div>
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">増加率</p>
          <p className="mt-2 text-lg font-black text-slate-950">
            {formatGrowthRate(snapshot?.followers ?? null, currentMetrics?.followers ?? null)}
          </p>
        </div>
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">保存日時</p>
          <p className="mt-2 text-sm font-black text-slate-950">
            {formatBookmarkDateTime(snapshot?.savedAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">保存時投稿数</p>
          <p className="mt-2 text-sm font-black text-slate-950">
            {formatBookmarkMetric(snapshot?.posts)}
          </p>
        </div>
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">保存時最大いいね</p>
          <p className="mt-2 text-sm font-black text-slate-950">
            {formatBookmarkMetric(snapshot?.maximumLikes)}
          </p>
        </div>
        <div className="border border-slate-200 bg-white px-3 py-3">
          <p className="deco-label">保存時指標日</p>
          <p className="mt-2 text-sm font-black text-slate-950">
            {formatBookmarkDate(snapshot?.metricDate)}
          </p>
        </div>
      </div>

      {!persistenceReady && (
        <p className="mt-3 text-sm text-slate-700">
          保存時スナップショットを使うには、user_bookmarks の saved_snapshot カラムをSupabaseへ反映してください。
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">エラー: {error}</p>}
    </div>
  );
}
