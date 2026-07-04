import type { BookmarkSavedSource } from "../../types";
import { formatBookmarkDateTime } from "../../logic/bookmarkFormatters";

export function BookmarkSavedSourcePanel({
  savedSource,
}: {
  savedSource: BookmarkSavedSource | null;
}) {
  return (
    <div className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="deco-label">保存元</p>
          {savedSource ? (
            <>
              <p className="mt-2 break-words text-sm font-black text-slate-950">
                {savedSource.source_label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                保存日時: {formatBookmarkDateTime(savedSource.created_at)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">保存元はまだ記録されていません。</p>
          )}
        </div>
        {Array.isArray(savedSource?.source_detail?.summary) && (
          <div className="flex max-w-full flex-wrap gap-2">
            {savedSource.source_detail.summary
              .filter((item): item is string => typeof item === "string")
              .slice(0, 4)
              .map((item) => (
                <span
                  key={item}
                  className="max-w-full break-words border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600"
                >
                  {item}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
