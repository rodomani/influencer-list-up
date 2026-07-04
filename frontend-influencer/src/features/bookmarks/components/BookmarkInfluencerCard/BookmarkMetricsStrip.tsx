import type { BookmarkMetricsRow } from "../../types";
import { formatBookmarkMetric } from "../../logic/bookmarkFormatters";

export function BookmarkMetricsStrip({ metrics }: { metrics: BookmarkMetricsRow | null }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3 sm:px-7 xl:px-7">
      <div className="min-w-0 border-l border-slate-200 pl-3">
        <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          投稿数
        </p>
        <p className="mt-2 break-words text-lg font-black text-slate-950">
          {formatBookmarkMetric(metrics?.posts)}
        </p>
      </div>
      <div className="min-w-0 border-l border-slate-200 pl-3">
        <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          フォロワー数
        </p>
        <p className="mt-2 break-words text-lg font-black text-slate-950">
          {formatBookmarkMetric(metrics?.followers)}
        </p>
      </div>
      <div className="min-w-0 border-l border-slate-200 pl-3">
        <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          最大いいね数
        </p>
        <p className="mt-2 break-words text-lg font-black text-slate-950">
          {formatBookmarkMetric(metrics?.maximum_likes)}
        </p>
      </div>
    </div>
  );
}
