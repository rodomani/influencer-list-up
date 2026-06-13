import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/features/bookmarks/api/useBookmarks";
import { BookmarkFoldersPanel } from "@/features/bookmarks/components/BookmarkFoldersPanel";
import { BookmarkMemoStatus } from "@/features/bookmarks/components/BookmarkMemoStatus";
import { BookmarkPriorityPanel } from "@/features/bookmarks/components/BookmarkPriorityPanel";
import { BookmarkReadinessPanel } from "@/features/bookmarks/components/BookmarkReadinessPanel";
import { BookmarkReadinessStatus } from "@/features/bookmarks/components/BookmarkReadinessStatus";
import { BookmarkRiskPanel } from "@/features/bookmarks/components/BookmarkRiskPanel";
import { BookmarkRiskStatus } from "@/features/bookmarks/components/BookmarkRiskStatus";
import { BookmarkRatingPanel } from "@/features/bookmarks/components/BookmarkRatingPanel";
import { BookmarkRatingStatus } from "@/features/bookmarks/components/BookmarkRatingStatus";
import { BookmarkSourceStatus } from "@/features/bookmarks/components/BookmarkSourceStatus";
import { BookmarkTagsPanel } from "@/features/bookmarks/components/BookmarkTagsPanel";
import { BookmarkWatchlistAlertsPanel } from "@/features/bookmarks/components/BookmarkWatchlistAlertsPanel";
import { BookmarksFolderEmptyState } from "@/features/bookmarks/components/BookmarksFolderEmptyState";
import { BookmarksGrid } from "@/features/bookmarks/components/BookmarksGrid";
import { BookmarksHero } from "@/features/bookmarks/components/BookmarksHero";
import { BookmarksStatus } from "@/features/bookmarks/components/BookmarksStatus";
import { BookmarksSummary } from "@/features/bookmarks/components/BookmarksSummary";

export function Bookmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookmarks = useBookmarks(user?.id);

  return (
    <div className="-mx-4 -my-5 flex min-h-screen w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-7 overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8">
      <BookmarksHero onBackToSearch={() => navigate("/search/search")} />
      <BookmarksStatus
        hasUser={Boolean(user)}
        loading={bookmarks.loading}
        error={bookmarks.error}
        count={bookmarks.influencers.length}
      />
      <BookmarksSummary
        loading={bookmarks.loading}
        count={bookmarks.influencers.length}
        summary={bookmarks.summary}
      />
      <BookmarkWatchlistAlertsPanel
        influencers={bookmarks.influencers}
        loading={bookmarks.loading}
      />
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkFoldersPanel
          folders={bookmarks.folders}
          selectedFolderId={bookmarks.selectedFolderId}
          totalCount={bookmarks.influencers.length}
          visibleCount={bookmarks.filteredInfluencers.length}
          creating={bookmarks.creatingFolder}
          error={bookmarks.folderError}
          persistenceReady={bookmarks.folderPersistenceReady}
          onSelectFolder={bookmarks.setSelectedFolderId}
          onCreateFolder={bookmarks.handleCreateFolder}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkTagsPanel
          tags={bookmarks.tags}
          selectedTagId={bookmarks.selectedTagId}
          creating={bookmarks.creatingTag}
          error={bookmarks.tagError}
          persistenceReady={bookmarks.tagPersistenceReady}
          onSelectTag={bookmarks.setSelectedTagId}
          onCreateTag={bookmarks.handleCreateTag}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkPriorityPanel
          selectedPriority={bookmarks.selectedPriority}
          totalCount={bookmarks.influencers.length}
          visibleCount={bookmarks.filteredInfluencers.length}
          error={bookmarks.priorityError}
          persistenceReady={bookmarks.priorityPersistenceReady}
          onSelectPriority={bookmarks.setSelectedPriority}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkReadinessPanel
          influencers={bookmarks.influencers}
          selectedReadiness={bookmarks.selectedReadiness}
          totalCount={bookmarks.influencers.length}
          visibleCount={bookmarks.filteredInfluencers.length}
          onSelectReadiness={bookmarks.setSelectedReadiness}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkReadinessStatus
          error={bookmarks.readinessError}
          persistenceReady={bookmarks.readinessPersistenceReady}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkRiskPanel
          influencers={bookmarks.influencers}
          selectedRiskLevel={bookmarks.selectedRiskLevel}
          totalCount={bookmarks.influencers.length}
          visibleCount={bookmarks.filteredInfluencers.length}
          onSelectRiskLevel={bookmarks.setSelectedRiskLevel}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkRiskStatus
          error={bookmarks.riskError}
          persistenceReady={bookmarks.riskPersistenceReady}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkRatingPanel
          influencers={bookmarks.influencers}
          selectedRating={bookmarks.selectedRating}
          totalCount={bookmarks.influencers.length}
          visibleCount={bookmarks.filteredInfluencers.length}
          onSelectRating={bookmarks.setSelectedRating}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkRatingStatus
          error={bookmarks.ratingError}
          persistenceReady={bookmarks.ratingPersistenceReady}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkMemoStatus
          error={bookmarks.memoError}
          persistenceReady={bookmarks.memoPersistenceReady}
        />
      )}
      {user && !bookmarks.loading && bookmarks.influencers.length > 0 && (
        <BookmarkSourceStatus
          error={bookmarks.sourceError}
          persistenceReady={bookmarks.sourcePersistenceReady}
        />
      )}
      <BookmarksFolderEmptyState
        visible={
          Boolean(user) &&
          !bookmarks.loading &&
          !bookmarks.error &&
          bookmarks.influencers.length > 0 &&
          bookmarks.filteredInfluencers.length === 0
        }
      />
      <BookmarksGrid
        influencers={bookmarks.filteredInfluencers}
        userId={user?.id}
        folders={bookmarks.folders}
        tags={bookmarks.tags}
        updatingFolderAssignment={bookmarks.updatingFolderAssignment}
        updatingTagAssignment={bookmarks.updatingTagAssignment}
        updatingPriorityId={bookmarks.updatingPriorityId}
        updatingReadinessId={bookmarks.updatingReadinessId}
        updatingRiskId={bookmarks.updatingRiskId}
        updatingPriceId={bookmarks.updatingPriceId}
        updatingContactId={bookmarks.updatingContactId}
        updatingSnapshotId={bookmarks.updatingSnapshotId}
        updatingRatingId={bookmarks.updatingRatingId}
        updatingResearchChecklistId={bookmarks.updatingResearchChecklistId}
        updatingMemoId={bookmarks.updatingMemoId}
        researchChecklistError={bookmarks.researchChecklistError}
        researchChecklistPersistenceReady={bookmarks.researchChecklistPersistenceReady}
        riskError={bookmarks.riskError}
        riskPersistenceReady={bookmarks.riskPersistenceReady}
        priceError={bookmarks.priceError}
        pricePersistenceReady={bookmarks.pricePersistenceReady}
        contactError={bookmarks.contactError}
        contactPersistenceReady={bookmarks.contactPersistenceReady}
        snapshotError={bookmarks.snapshotError}
        snapshotPersistenceReady={bookmarks.snapshotPersistenceReady}
        onOpenInfluencer={(id) => navigate(`/search/influencer/${id}`)}
        onToggleBookmark={bookmarks.handleToggleBookmark}
        onPriorityChange={bookmarks.handlePriorityChange}
        onReadinessChange={bookmarks.handleReadinessChange}
        onRiskProfileSave={bookmarks.handleRiskProfileSave}
        onPriceMemorySave={bookmarks.handlePriceMemorySave}
        onContactInfoSave={bookmarks.handleContactInfoSave}
        onSavedSnapshotCapture={bookmarks.handleSavedSnapshotCapture}
        onRatingChange={bookmarks.handleRatingChange}
        onResearchChecklistSave={bookmarks.handleResearchChecklistSave}
        onMemoSave={bookmarks.handleMemoSave}
        onToggleFolder={bookmarks.handleToggleFolderAssignment}
        onToggleTag={bookmarks.handleToggleTagAssignment}
      />
    </div>
  );
}
