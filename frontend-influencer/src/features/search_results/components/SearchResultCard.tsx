import { Button } from "@/components/ui/button";
import star from "@/assets/star.png";
import starToggle from "@/assets/star-2.png";
import { useEffect, useState } from "react";
import type { InfluencerNormalized } from "../types";
import {
  dataFreshness,
  formatDateYmd,
  formatDays,
  formatMetric,
  mostRecentTimestamp,
  splitKeywords,
} from "../logic/formatters";

type SearchResultCardProps = {
  influencer: InfluencerNormalized;
  userId: string | undefined;
  isSelectedForCompare: boolean;
  onNavigateToDetail: (id: number) => void;
  onToggleCompare: (influencer: InfluencerNormalized) => void;
  onToggleBookmark: (influencer: InfluencerNormalized) => void;
  onSelectCampaignTarget: (influencer: InfluencerNormalized) => void;
  onOpenCampaignDialog: (open: boolean) => void;
};

export function SearchResultCard({
  influencer,
  userId,
  isSelectedForCompare,
  onNavigateToDetail,
  onToggleCompare,
  onToggleBookmark,
  onSelectCampaignTarget,
  onOpenCampaignDialog,
}: SearchResultCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const metrics = influencer.accounts_metrics;
  const freshestDate = mostRecentTimestamp(
    metrics?.metric_date,
    influencer.latest_activity_at,
    influencer.latest_posted_at
  );
  const freshness = dataFreshness(freshestDate);
  const keywordList = splitKeywords(influencer.keywords);
  const isBookmarked = influencer.hasUserBookmark;
  const showProfileImage = Boolean(influencer.profile_image_url) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [influencer.id, influencer.profile_image_url]);

  return (
    <article
      className={`group w-full max-w-full overflow-hidden border bg-white shadow-[0_20px_70px_-54px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37]/70 hover:shadow-[0_28px_90px_-60px_rgba(15,23,42,0.42)] ${
        isSelectedForCompare
          ? "border-[#046307] ring-2 ring-[#046307]/15"
          : "border-slate-200"
      }`}
    >
      <div className="grid min-w-0 gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)] xl:items-center 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.62fr)]">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          {showProfileImage ? (
            <img
              src={influencer.profile_image_url ?? undefined}
              alt={`${influencer.account_name} profile`}
              className="h-20 w-20 shrink-0 rounded-full border border-[#D4AF37]/50 object-cover p-1"
              loading="lazy"
              onError={() => {
                setImageFailed(true);
              }}
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
            <p className="mt-1 text-sm text-slate-500">
              性別: {influencer.gender ?? "未設定"}
            </p>
          </div>
        </div>

        <div className="min-w-0 border-y border-slate-200 py-5 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            キーワード
          </p>
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
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <div className="min-w-0 border-l border-slate-200 pl-3">
            <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">投稿数</p>
            <p className="mt-2 break-words text-lg font-black text-slate-950">{formatMetric(metrics?.posts)}</p>
          </div>
          <div className="min-w-0 border-l border-slate-200 pl-3">
            <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">フォロワー数</p>
            <p className="mt-2 break-words text-lg font-black text-slate-950">{formatMetric(metrics?.followers)}</p>
          </div>
          <div className="min-w-0 border-l border-slate-200 pl-3">
            <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">最大いいね数</p>
            <p className="mt-2 break-words text-lg font-black text-slate-950">{formatMetric(metrics?.maximum_likes)}</p>
          </div>
          <div className="min-w-0 border-l border-slate-200 pl-3">
            <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">最新投稿日</p>
            <p className="mt-2 break-words text-lg font-black text-slate-950">{formatDateYmd(influencer.latest_posted_at)}</p>
            <p className="mt-1 text-xs text-slate-500">継続: {formatDays(influencer.posting_span_days)}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row xl:flex-col xl:items-stretch">
          <div className={`border px-3 py-2 text-xs font-black ${freshness.className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="uppercase tracking-[0.16em]">データ鮮度</span>
              <span>{freshness.label}</span>
            </div>
            <div className="mt-1 text-[11px] font-bold opacity-80">
              {freshness.age} / {formatDateYmd(freshestDate)}
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant={isSelectedForCompare ? "default" : "outline"}
            className={`h-auto min-h-10 w-full whitespace-normal px-3 py-2 text-center text-xs font-black leading-tight tracking-[0.08em] sm:flex-1 xl:flex-none ${
              isSelectedForCompare
                ? "bg-[#046307] text-white hover:bg-[#034d06]"
                : "border-slate-300 bg-white text-slate-900 hover:border-[#D4AF37]"
            }`}
            aria-pressed={isSelectedForCompare}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCompare(influencer);
            }}
          >
            {isSelectedForCompare ? "比較から外す" : "比較に追加"}
          </Button>

          {userId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-auto min-h-10 w-full whitespace-normal border-slate-300 bg-white px-3 py-2 text-center text-xs leading-tight text-slate-900 hover:border-[#D4AF37] sm:flex-1 xl:flex-none"
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? "ブックマーク解除" : "ブックマーク追加"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleBookmark(influencer);
              }}
            >
              {isBookmarked ? (
                <img src={starToggle} alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
              ) : (
                <img src={star} alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
              )}
              <span className="min-w-0 break-words">ブックマーク</span>
            </Button>
          ) : null}

          <Button
            className="h-auto min-h-10 w-full whitespace-normal bg-[#046307] px-3 py-2 text-center text-xs font-black uppercase leading-tight tracking-[0.08em] text-white hover:bg-[#034d06] sm:flex-1 xl:flex-none"
            onClick={(event) => {
              event.stopPropagation();
              onSelectCampaignTarget(influencer);
              onOpenCampaignDialog(true);
            }}
          >
            キャンペーンに追加
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7">
        <Button
          type="button"
          variant="outline"
          className="w-full border-slate-300 bg-white text-slate-900 hover:border-[#D4AF37]"
          onClick={() => onNavigateToDetail(influencer.id)}
        >
          詳細を見る
        </Button>
      </div>
    </article>
  );
}
