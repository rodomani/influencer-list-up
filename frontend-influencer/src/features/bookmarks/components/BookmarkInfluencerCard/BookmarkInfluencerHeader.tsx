import { Button } from "@/components/ui/button";
import starToggle from "@/assets/star-2.png";
import type {
  BookmarkedInfluencer,
  BookmarkPriorityValue,
  BookmarkReadinessValue,
  BookmarkRatingValue,
} from "../../types";
import { BookmarkReadinessSelect } from "../BookmarkReadinessSelect";
import { BookmarkRatingControl } from "../BookmarkRatingControl";
import { splitBookmarkKeywords, formatBookmarkDate } from "../../logic/bookmarkFormatters";
import {
  BOOKMARK_PRIORITY_OPTIONS,
  bookmarkPriorityClassName,
  bookmarkPriorityLabel,
} from "../../logic/bookmarkPriority";

type BookmarkInfluencerHeaderProps = {
  influencer: BookmarkedInfluencer;
  updatingPriority: boolean;
  updatingReadiness: boolean;
  updatingRating: boolean;
  onToggleBookmark: (influencer: BookmarkedInfluencer) => void;
  onPriorityChange: (payload: {
    influencer: BookmarkedInfluencer;
    priority: BookmarkPriorityValue | null;
  }) => void;
  onReadinessChange: (payload: {
    influencer: BookmarkedInfluencer;
    readiness: BookmarkReadinessValue;
  }) => void;
  onRatingChange: (payload: {
    influencer: BookmarkedInfluencer;
    rating: BookmarkRatingValue | null;
  }) => void;
};

export function BookmarkInfluencerHeader({
  influencer,
  updatingPriority,
  updatingReadiness,
  updatingRating,
  onToggleBookmark,
  onPriorityChange,
  onReadinessChange,
  onRatingChange,
}: BookmarkInfluencerHeaderProps) {
  const keywordList = splitBookmarkKeywords(influencer.keywords);

  return (
    <div className="grid min-w-0 gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] xl:items-center 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,0.45fr)]">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        {influencer.profile_image_url ? (
          <img
            src={influencer.profile_image_url}
            alt={`${influencer.account_name} profile`}
            className="h-20 w-20 shrink-0 rounded-full border border-[#D4AF37]/50 object-cover p-1"
            loading="lazy"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-black uppercase text-slate-400">
            {influencer.account_name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#046307]">
            {influencer.platform}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-[0.08em] text-slate-950">
            {influencer.account_name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">性別: {influencer.gender ?? "未設定"}</p>
        </div>
      </div>

      <div className="min-w-0 border-y border-slate-200 py-5 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">キーワード</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {keywordList.length ? (
            keywordList.map((keyword) => (
              <span
                key={keyword}
                className="max-w-full break-words border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                {keyword}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">未設定</span>
          )}
        </div>
        <p className="mt-4 text-xs font-bold text-slate-500">
          最終更新: {formatBookmarkDate(influencer.last_profile_scraped_at)}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          最終活動: {formatBookmarkDate(influencer.latest_activity_at)}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row xl:flex-col xl:items-stretch">
        <div
          className={`border px-3 py-2 text-xs font-black ${bookmarkPriorityClassName(influencer.priority)}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="uppercase tracking-[0.16em]">優先度</span>
            <span>{bookmarkPriorityLabel(influencer.priority)}</span>
          </div>
          <select
            value={influencer.priority ?? "none"}
            disabled={updatingPriority}
            className="mt-2 h-9 w-full border border-slate-300 bg-white px-2 text-xs font-bold text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            onChange={(event) =>
              onPriorityChange({
                influencer,
                priority:
                  event.target.value === "none"
                    ? null
                    : (event.target.value as BookmarkPriorityValue),
              })
            }
          >
            <option value="none">未設定</option>
            {BOOKMARK_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {bookmarkPriorityLabel(option.value)}
              </option>
            ))}
          </select>
        </div>

        <BookmarkReadinessSelect
          value={influencer.candidateReadiness}
          disabled={updatingReadiness}
          onChange={(readiness) => onReadinessChange({ influencer, readiness })}
        />

        <BookmarkRatingControl
          value={influencer.personalRating}
          disabled={updatingRating}
          onChange={(rating) => onRatingChange({ influencer, rating })}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-10 w-full whitespace-normal border-slate-300 bg-white px-3 py-2 text-center text-xs leading-tight text-slate-900 hover:border-[#D4AF37]"
          aria-pressed={influencer.hasUserBookmark}
          onClick={(event) => {
            event.stopPropagation();
            onToggleBookmark(influencer);
          }}
        >
          <img src={starToggle} alt="お気に入り" className="h-5 w-5 shrink-0" />
          <span className="min-w-0 break-words">解除</span>
        </Button>
      </div>
    </div>
  );
}
