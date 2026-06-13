import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import starToggle from "@/assets/star-2.png";
import type {
  BookmarkContactInfo,
  BookmarkedInfluencer,
  BookmarkPriceMemory,
  BookmarkResearchChecklist,
  BookmarkPriorityValue,
  BookmarkReadinessValue,
  BookmarkRiskLevelValue,
  BookmarkRatingValue,
} from "../types";
import { BookmarkResearchChecklist as BookmarkResearchChecklistPanel } from "./BookmarkResearchChecklist";
import { BookmarkPriceMemory as BookmarkPriceMemoryPanel } from "./BookmarkPriceMemory";
import { BookmarkContactVault } from "./BookmarkContactVault";
import { BookmarkSavedSnapshot } from "./BookmarkSavedSnapshot";
import { BookmarkReadinessSelect } from "./BookmarkReadinessSelect";
import { BookmarkRiskProfile } from "./BookmarkRiskProfile";
import { BookmarkRatingControl } from "./BookmarkRatingControl";
import {
  formatBookmarkDate,
  formatBookmarkDateTime,
  formatBookmarkMetric,
  splitBookmarkKeywords,
} from "../logic/bookmarkFormatters";
import {
  BOOKMARK_PRIORITY_OPTIONS,
  bookmarkPriorityClassName,
  bookmarkPriorityLabel,
} from "../logic/bookmarkPriority";
import {
  bookmarkAlertClassName,
  buildBookmarkWatchlistAlerts,
} from "../logic/bookmarkWatchlistAlerts";

type BookmarkInfluencerCardProps = {
  influencer: BookmarkedInfluencer;
  userId: string;
  folders: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  updatingFolderAssignment: string | null;
  updatingTagAssignment: string | null;
  updatingPriority: boolean;
  updatingReadiness: boolean;
  updatingRisk: boolean;
  updatingPrice: boolean;
  updatingContact: boolean;
  updatingSnapshot: boolean;
  updatingRating: boolean;
  updatingResearchChecklist: boolean;
  updatingMemo: boolean;
  researchChecklistError: string | null;
  researchChecklistPersistenceReady: boolean;
  riskError: string | null;
  riskPersistenceReady: boolean;
  priceError: string | null;
  pricePersistenceReady: boolean;
  contactError: string | null;
  contactPersistenceReady: boolean;
  snapshotError: string | null;
  snapshotPersistenceReady: boolean;
  onOpen: (id: number) => void;
  onToggleBookmark: (influencer: BookmarkedInfluencer) => void;
  onPriorityChange: (payload: {
    influencer: BookmarkedInfluencer;
    priority: BookmarkPriorityValue | null;
  }) => void;
  onReadinessChange: (payload: {
    influencer: BookmarkedInfluencer;
    readiness: BookmarkReadinessValue;
  }) => void;
  onRiskProfileSave: (payload: {
    influencer: BookmarkedInfluencer;
    riskLevel: BookmarkRiskLevelValue;
    riskNotes: string;
  }) => Promise<boolean>;
  onPriceMemorySave: (payload: {
    influencer: BookmarkedInfluencer;
    priceMemory: Pick<
      BookmarkPriceMemory,
      "estimated_price_min" | "estimated_price_max" | "price_note"
    >;
  }) => Promise<boolean>;
  onContactInfoSave: (payload: {
    influencer: BookmarkedInfluencer;
    contactInfo: BookmarkContactInfo;
  }) => Promise<boolean>;
  onSavedSnapshotCapture: (payload: {
    influencer: BookmarkedInfluencer;
  }) => Promise<boolean>;
  onRatingChange: (payload: {
    influencer: BookmarkedInfluencer;
    rating: BookmarkRatingValue | null;
  }) => void;
  onResearchChecklistSave: (payload: {
    influencer: BookmarkedInfluencer;
    checklist: BookmarkResearchChecklist;
  }) => Promise<boolean>;
  onToggleFolder: (payload: {
    influencer: BookmarkedInfluencer;
    folderId: number;
  }) => void;
  onToggleTag: (payload: {
    influencer: BookmarkedInfluencer;
    tagId: number;
  }) => void;
  onMemoSave: (payload: {
    influencer: BookmarkedInfluencer;
    memo: string;
  }) => Promise<boolean>;
};

export function BookmarkInfluencerCard({
  influencer,
  userId,
  folders,
  tags,
  updatingFolderAssignment,
  updatingTagAssignment,
  updatingPriority,
  updatingReadiness,
  updatingRisk,
  updatingPrice,
  updatingContact,
  updatingSnapshot,
  updatingRating,
  updatingResearchChecklist,
  updatingMemo,
  researchChecklistError,
  researchChecklistPersistenceReady,
  riskError,
  riskPersistenceReady,
  priceError,
  pricePersistenceReady,
  contactError,
  contactPersistenceReady,
  snapshotError,
  snapshotPersistenceReady,
  onOpen,
  onToggleBookmark,
  onPriorityChange,
  onReadinessChange,
  onRiskProfileSave,
  onPriceMemorySave,
  onContactInfoSave,
  onSavedSnapshotCapture,
  onRatingChange,
  onResearchChecklistSave,
  onToggleFolder,
  onToggleTag,
  onMemoSave,
}: BookmarkInfluencerCardProps) {
  const metrics = influencer.accounts_metrics;
  const keywordList = splitBookmarkKeywords(influencer.keywords);
  const alerts = buildBookmarkWatchlistAlerts(influencer);
  const [memoDraft, setMemoDraft] = useState(influencer.whySavedMemo);

  useEffect(() => {
    setMemoDraft(influencer.whySavedMemo);
  }, [influencer.id, influencer.whySavedMemo]);

  return (
    <article
      className="group w-full max-w-full cursor-pointer overflow-hidden border border-slate-200 bg-white shadow-[0_20px_70px_-54px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37]/70 hover:shadow-[0_28px_90px_-60px_rgba(15,23,42,0.42)]"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(influencer.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(influencer.id);
        }
      }}
    >
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
          <p className="mt-4 text-xs font-bold text-slate-500">
            最終更新: {formatBookmarkDate(influencer.last_profile_scraped_at)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            最終活動: {formatBookmarkDate(influencer.latest_activity_at)}
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
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
            onChange={(readiness) =>
              onReadinessChange({
                influencer,
                readiness,
              })
            }
          />

          <BookmarkRatingControl
            value={influencer.personalRating}
            disabled={updatingRating}
            onChange={(rating) =>
              onRatingChange({
                influencer,
                rating,
              })
            }
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

      {alerts.length > 0 && (
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
      )}

      <div className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="deco-label">保存元</p>
            {influencer.savedSource ? (
              <>
                <p className="mt-2 break-words text-sm font-black text-slate-950">
                  {influencer.savedSource.source_label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  保存日時: {formatBookmarkDateTime(influencer.savedSource.created_at)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                保存元はまだ記録されていません。
              </p>
            )}
          </div>
          {Array.isArray(influencer.savedSource?.source_detail?.summary) && (
            <div className="flex max-w-full flex-wrap gap-2">
              {influencer.savedSource.source_detail.summary
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

      {folders.length > 0 && (
        <div
          className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="deco-label mr-1">所属フォルダー</span>
            {folders.map((folder) => {
              const assigned = influencer.folderIds.includes(folder.id);
              const assignmentKey = `${influencer.id}-${folder.id}`;

              return (
                <button
                  key={folder.id}
                  type="button"
                  disabled={updatingFolderAssignment === assignmentKey}
                  className={`max-w-full break-words border px-3 py-1.5 text-xs font-black transition ${
                    assigned
                      ? "border-[#046307]/30 bg-[#ecfdf5] text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#D4AF37]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-pressed={assigned}
                  onClick={() =>
                    onToggleFolder({
                      influencer,
                      folderId: folder.id,
                    })
                  }
                >
                  {folder.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div
          className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="deco-label mr-1">タレントタグ</span>
            {tags.map((tag) => {
              const assigned = influencer.tagIds.includes(tag.id);
              const assignmentKey = `${influencer.id}-${tag.id}`;

              return (
                <button
                  key={tag.id}
                  type="button"
                  disabled={updatingTagAssignment === assignmentKey}
                  className={`max-w-full break-words border px-3 py-1.5 text-xs font-black transition ${
                    assigned
                      ? "border-[#D4AF37]/45 bg-[#fffdf7] text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#D4AF37]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-pressed={assigned}
                  onClick={() =>
                    onToggleTag({
                      influencer,
                      tagId: tag.id,
                    })
                  }
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <BookmarkResearchChecklistPanel
        value={influencer.researchChecklist}
        updating={updatingResearchChecklist}
        error={researchChecklistError}
        persistenceReady={researchChecklistPersistenceReady}
        onSave={(checklist) =>
          onResearchChecklistSave({
            influencer,
            checklist,
          })
        }
      />

      <BookmarkRiskProfile
        riskLevel={influencer.riskLevel}
        riskNotes={influencer.riskNotes}
        updating={updatingRisk}
        error={riskError}
        persistenceReady={riskPersistenceReady}
        onSave={({ riskLevel, riskNotes }) =>
          onRiskProfileSave({
            influencer,
            riskLevel,
            riskNotes,
          })
        }
      />

      <BookmarkPriceMemoryPanel
        value={influencer.priceMemory}
        updating={updatingPrice}
        error={priceError}
        persistenceReady={pricePersistenceReady}
        onSave={(priceMemory) =>
          onPriceMemorySave({
            influencer,
            priceMemory,
          })
        }
      />

      <BookmarkContactVault
        value={influencer.contactInfo}
        updating={updatingContact}
        error={contactError}
        persistenceReady={contactPersistenceReady}
        onSave={(contactInfo) =>
          onContactInfoSave({
            influencer,
            contactInfo,
          })
        }
      />

      <BookmarkSavedSnapshot
        snapshot={influencer.savedSnapshot}
        currentMetrics={influencer.accounts_metrics}
        updating={updatingSnapshot}
        error={snapshotError}
        persistenceReady={snapshotPersistenceReady}
        onCapture={() =>
          onSavedSnapshotCapture({
            influencer,
          })
        }
      />

      <div
        className="border-t border-slate-200 bg-[#f9fafb] px-5 py-4 sm:px-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="deco-label">保存理由メモ</p>
            <p className="mt-1 text-xs text-muted-foreground">
              なぜ保存したのか、候補として気になる理由を残せます。
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={updatingMemo || memoDraft.trim() === influencer.whySavedMemo}
            onClick={async () => {
              await onMemoSave({
                influencer,
                memo: memoDraft,
              });
            }}
          >
            {updatingMemo ? "保存中..." : "メモを保存"}
          </Button>
        </div>
        <textarea
          value={memoDraft}
          disabled={updatingMemo}
          onChange={(event) => setMemoDraft(event.target.value)}
          className="mt-3 min-h-24 w-full resize-y border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          placeholder="例: コメント品質が高い。美容系キャンペーンで候補にしたい。"
        />
      </div>
    </article>
  );
}
