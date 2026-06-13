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
import { BookmarkInfluencerCard } from "./BookmarkInfluencerCard";

type BookmarksGridProps = {
  influencers: BookmarkedInfluencer[];
  userId: string | undefined;
  folders: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  updatingFolderAssignment: string | null;
  updatingTagAssignment: string | null;
  updatingPriorityId: number | null;
  updatingReadinessId: number | null;
  updatingRiskId: number | null;
  updatingPriceId: number | null;
  updatingContactId: number | null;
  updatingSnapshotId: number | null;
  updatingRatingId: number | null;
  updatingResearchChecklistId: number | null;
  updatingMemoId: number | null;
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
  onOpenInfluencer: (id: number) => void;
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
  onMemoSave: (payload: {
    influencer: BookmarkedInfluencer;
    memo: string;
  }) => Promise<boolean>;
  onToggleFolder: (payload: {
    influencer: BookmarkedInfluencer;
    folderId: number;
  }) => void;
  onToggleTag: (payload: {
    influencer: BookmarkedInfluencer;
    tagId: number;
  }) => void;
};

export function BookmarksGrid({
  influencers,
  userId,
  folders,
  tags,
  updatingFolderAssignment,
  updatingTagAssignment,
  updatingPriorityId,
  updatingReadinessId,
  updatingRiskId,
  updatingPriceId,
  updatingContactId,
  updatingSnapshotId,
  updatingRatingId,
  updatingResearchChecklistId,
  updatingMemoId,
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
  onOpenInfluencer,
  onToggleBookmark,
  onPriorityChange,
  onReadinessChange,
  onRiskProfileSave,
  onPriceMemorySave,
  onContactInfoSave,
  onSavedSnapshotCapture,
  onRatingChange,
  onResearchChecklistSave,
  onMemoSave,
  onToggleFolder,
  onToggleTag,
}: BookmarksGridProps) {
  if (!userId || influencers.length === 0) return null;

  return (
    <section className="grid w-full min-w-0 gap-5">
      {influencers.map((influencer) => (
        <BookmarkInfluencerCard
          key={influencer.id}
          influencer={influencer}
          userId={userId}
          folders={folders}
          tags={tags}
          updatingFolderAssignment={updatingFolderAssignment}
          updatingTagAssignment={updatingTagAssignment}
          updatingPriority={updatingPriorityId === influencer.id}
          updatingReadiness={updatingReadinessId === influencer.id}
          updatingRisk={updatingRiskId === influencer.id}
          updatingPrice={updatingPriceId === influencer.id}
          updatingContact={updatingContactId === influencer.id}
          updatingSnapshot={updatingSnapshotId === influencer.id}
          updatingRating={updatingRatingId === influencer.id}
          updatingResearchChecklist={updatingResearchChecklistId === influencer.id}
          updatingMemo={updatingMemoId === influencer.id}
          researchChecklistError={researchChecklistError}
          researchChecklistPersistenceReady={researchChecklistPersistenceReady}
          riskError={riskError}
          riskPersistenceReady={riskPersistenceReady}
          priceError={priceError}
          pricePersistenceReady={pricePersistenceReady}
          contactError={contactError}
          contactPersistenceReady={contactPersistenceReady}
          snapshotError={snapshotError}
          snapshotPersistenceReady={snapshotPersistenceReady}
          onOpen={onOpenInfluencer}
          onToggleBookmark={onToggleBookmark}
          onPriorityChange={onPriorityChange}
          onReadinessChange={onReadinessChange}
          onRiskProfileSave={onRiskProfileSave}
          onPriceMemorySave={onPriceMemorySave}
          onContactInfoSave={onContactInfoSave}
          onSavedSnapshotCapture={onSavedSnapshotCapture}
          onRatingChange={onRatingChange}
          onResearchChecklistSave={onResearchChecklistSave}
          onMemoSave={onMemoSave}
          onToggleFolder={onToggleFolder}
          onToggleTag={onToggleTag}
        />
      ))}
    </section>
  );
}
