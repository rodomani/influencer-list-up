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
import { BookmarkInfluencerHeader } from "./BookmarkInfluencerCard/BookmarkInfluencerHeader";
import { BookmarkMetricsStrip } from "./BookmarkInfluencerCard/BookmarkMetricsStrip";
import { BookmarkSavedSourcePanel } from "./BookmarkInfluencerCard/BookmarkSavedSourcePanel";
import { BookmarkFolderTagControls } from "./BookmarkInfluencerCard/BookmarkFolderTagControls";
import { BookmarkWatchlistAlertsSection } from "./BookmarkInfluencerCard/BookmarkWatchlistAlertsSection";
import { BookmarkChecklistPanel } from "./BookmarkInfluencerCard/BookmarkChecklistPanel";
import { BookmarkRiskCardPanel } from "./BookmarkInfluencerCard/BookmarkRiskCardPanel";
import { BookmarkPricePanel } from "./BookmarkInfluencerCard/BookmarkPricePanel";
import { BookmarkContactPanel } from "./BookmarkInfluencerCard/BookmarkContactPanel";
import { BookmarkSnapshotPanel } from "./BookmarkInfluencerCard/BookmarkSnapshotPanel";
import { BookmarkMemoSection } from "./BookmarkInfluencerCard/BookmarkMemoSection";

type BookmarkInfluencerCardProps = {
  influencer: BookmarkedInfluencer;
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
      <BookmarkInfluencerHeader
        influencer={influencer}
        updatingPriority={updatingPriority}
        updatingReadiness={updatingReadiness}
        updatingRating={updatingRating}
        onToggleBookmark={onToggleBookmark}
        onPriorityChange={onPriorityChange}
        onReadinessChange={onReadinessChange}
        onRatingChange={onRatingChange}
      />
      <BookmarkMetricsStrip metrics={metrics} />

      <BookmarkWatchlistAlertsSection influencer={influencer} />

      <BookmarkSavedSourcePanel savedSource={influencer.savedSource} />

      <BookmarkFolderTagControls
        influencer={influencer}
        folders={folders}
        tags={tags}
        updatingFolderAssignment={updatingFolderAssignment}
        updatingTagAssignment={updatingTagAssignment}
        onToggleFolder={onToggleFolder}
        onToggleTag={onToggleTag}
      />

      <BookmarkChecklistPanel
        influencer={influencer}
        updating={updatingResearchChecklist}
        error={researchChecklistError}
        persistenceReady={researchChecklistPersistenceReady}
        onSave={onResearchChecklistSave}
      />

      <BookmarkRiskCardPanel
        influencer={influencer}
        updating={updatingRisk}
        error={riskError}
        persistenceReady={riskPersistenceReady}
        onSave={onRiskProfileSave}
      />

      <BookmarkPricePanel
        influencer={influencer}
        updating={updatingPrice}
        error={priceError}
        persistenceReady={pricePersistenceReady}
        onSave={onPriceMemorySave}
      />

      <BookmarkContactPanel
        influencer={influencer}
        updating={updatingContact}
        error={contactError}
        persistenceReady={contactPersistenceReady}
        onSave={onContactInfoSave}
      />

      <BookmarkSnapshotPanel
        influencer={influencer}
        updating={updatingSnapshot}
        error={snapshotError}
        persistenceReady={snapshotPersistenceReady}
        onCapture={onSavedSnapshotCapture}
      />

      <BookmarkMemoSection
        influencer={influencer}
        updatingMemo={updatingMemo}
        onSave={onMemoSave}
      />
    </article>
  );
}
