import { useEffect, useMemo, useState } from "react";
import type {
  BookmarkContactInfo,
  BookmarkedInfluencer,
  BookmarkPriceMemory,
  BookmarkResearchChecklist,
  BookmarkSavedSnapshot,
  BookmarkPriorityValue,
  BookmarkReadinessValue,
  BookmarkRiskLevelValue,
  BookmarkRatingValue,
  BookmarkSavedSource,
} from "../types";
import {
  addInfluencerToBookmarkTag,
  addInfluencerToBookmarkFolder,
  addUserBookmark,
  createBookmarkFolder,
  createBookmarkTag,
  clearBookmarkPriority,
  fetchBookmarkMemos,
  fetchBookmarkFolderItems,
  fetchBookmarkFolders,
  fetchBookmarkPriorities,
  fetchBookmarkReadinesses,
  fetchBookmarkRiskProfiles,
  fetchBookmarkSources,
  fetchBookmarkTagItems,
  fetchBookmarkTags,
  fetchBookmarkedInfluencers,
  removeInfluencerFromBookmarkFolder,
  removeInfluencerFromBookmarkTag,
  removeUserBookmark,
  saveBookmarkContactInfo,
  saveBookmarkMemo,
  saveBookmarkPriceMemory,
  saveBookmarkResearchChecklist,
  saveBookmarkRiskProfile,
  saveBookmarkSavedSnapshot,
  setBookmarkPriority,
  setBookmarkReadiness,
  clearBookmarkRating,
  setBookmarkRating,
} from "./bookmarkQueries";

export const useBookmarks = (userId: string | undefined) => {
  const [influencers, setInfluencers] = useState<BookmarkedInfluencer[]>([]);
  const [folders, setFolders] = useState<{ id: number; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | "all">("all");
  const [selectedTagId, setSelectedTagId] = useState<number | "all">("all");
  const [selectedPriority, setSelectedPriority] = useState<BookmarkPriorityValue | "all">("all");
  const [selectedReadiness, setSelectedReadiness] = useState<BookmarkReadinessValue | "all">("all");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<BookmarkRiskLevelValue | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [researchChecklistError, setResearchChecklistError] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [folderPersistenceReady, setFolderPersistenceReady] = useState(true);
  const [tagPersistenceReady, setTagPersistenceReady] = useState(true);
  const [priorityPersistenceReady, setPriorityPersistenceReady] = useState(true);
  const [readinessPersistenceReady, setReadinessPersistenceReady] = useState(true);
  const [riskPersistenceReady, setRiskPersistenceReady] = useState(true);
  const [pricePersistenceReady, setPricePersistenceReady] = useState(true);
  const [contactPersistenceReady, setContactPersistenceReady] = useState(true);
  const [snapshotPersistenceReady, setSnapshotPersistenceReady] = useState(true);
  const [researchChecklistPersistenceReady, setResearchChecklistPersistenceReady] = useState(true);
  const [memoPersistenceReady, setMemoPersistenceReady] = useState(true);
  const [sourcePersistenceReady, setSourcePersistenceReady] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [updatingFolderAssignment, setUpdatingFolderAssignment] = useState<string | null>(null);
  const [updatingTagAssignment, setUpdatingTagAssignment] = useState<string | null>(null);
  const [updatingPriorityId, setUpdatingPriorityId] = useState<number | null>(null);
  const [updatingReadinessId, setUpdatingReadinessId] = useState<number | null>(null);
  const [updatingRiskId, setUpdatingRiskId] = useState<number | null>(null);
  const [updatingPriceId, setUpdatingPriceId] = useState<number | null>(null);
  const [updatingContactId, setUpdatingContactId] = useState<number | null>(null);
  const [updatingSnapshotId, setUpdatingSnapshotId] = useState<number | null>(null);
  const [updatingResearchChecklistId, setUpdatingResearchChecklistId] = useState<number | null>(null);
  const [updatingMemoId, setUpdatingMemoId] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<BookmarkRatingValue | "all">("all");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingPersistenceReady, setRatingPersistenceReady] = useState(true);
  const [updatingRatingId, setUpdatingRatingId] = useState<number | null>(null);

  useEffect(() => {
    const loadBookmarks = async () => {
      if (!userId) {
        setInfluencers([]);
        setFolders([]);
        setTags([]);
        setSelectedFolderId("all");
        setSelectedTagId("all");
        setSelectedPriority("all");
        setSelectedReadiness("all");
        setSelectedRiskLevel("all");
        setSelectedRating("all");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const bookmarkedInfluencers = await fetchBookmarkedInfluencers(userId);
        const accountIds = bookmarkedInfluencers.map((influencer) => influencer.id);
        const [
          folderResult,
          folderItemResult,
          tagResult,
          tagItemResult,
          priorityResult,
          readinessResult,
          riskResult,
          memoResult,
          sourceResult,
        ] = await Promise.all([
          fetchBookmarkFolders(userId),
          fetchBookmarkFolderItems({
            userId,
            accountIds,
          }),
          fetchBookmarkTags(userId),
          fetchBookmarkTagItems({
            userId,
            accountIds,
          }),
          fetchBookmarkPriorities({
            userId,
            accountIds,
          }),
          fetchBookmarkReadinesses({
            userId,
            accountIds,
          }),
          fetchBookmarkRiskProfiles({
            userId,
            accountIds,
          }),
          fetchBookmarkMemos({
            userId,
            accountIds,
          }),
          fetchBookmarkSources({
            userId,
            accountIds,
          }),
        ]);
        const folderIdsByAccount = new Map<number, number[]>();
        const tagIdsByAccount = new Map<number, number[]>();
        const priorityByAccount = new Map<number, BookmarkPriorityValue>();
        const readinessByAccount = new Map<number, BookmarkReadinessValue>();
        const riskLevelByAccount = new Map<number, BookmarkRiskLevelValue>();
        const riskNotesByAccount = new Map<number, string>();
        const memoByAccount = new Map<number, string>();
        const sourceByAccount = new Map<number, BookmarkSavedSource>();

        folderItemResult.items.forEach((item) => {
          folderIdsByAccount.set(item.account_id, [
            ...(folderIdsByAccount.get(item.account_id) ?? []),
            item.folder_id,
          ]);
        });

        tagItemResult.items.forEach((item) => {
          tagIdsByAccount.set(item.account_id, [
            ...(tagIdsByAccount.get(item.account_id) ?? []),
            item.tag_id,
          ]);
        });

        priorityResult.priorities.forEach((item) => {
          priorityByAccount.set(item.account_id, item.priority);
        });

        readinessResult.readinesses.forEach((item) => {
          readinessByAccount.set(item.account_id, item.readiness);
        });

        riskResult.riskProfiles.forEach((item) => {
          riskLevelByAccount.set(item.account_id, item.risk_level);
          riskNotesByAccount.set(item.account_id, item.risk_notes);
        });

        memoResult.memos.forEach((item) => {
          memoByAccount.set(item.account_id, item.memo);
        });

        sourceResult.sources.forEach((item) => {
          sourceByAccount.set(item.account_id, item);
        });

        setInfluencers(
          bookmarkedInfluencers.map((influencer) => ({
            ...influencer,
            folderIds: folderIdsByAccount.get(influencer.id) ?? [],
            tagIds: tagIdsByAccount.get(influencer.id) ?? [],
            priority: priorityByAccount.get(influencer.id) ?? null,
            candidateReadiness:
              readinessByAccount.get(influencer.id) ?? influencer.candidateReadiness,
            riskLevel: riskLevelByAccount.get(influencer.id) ?? influencer.riskLevel,
            riskNotes: riskNotesByAccount.get(influencer.id) ?? influencer.riskNotes,
            whySavedMemo: memoByAccount.get(influencer.id) ?? "",
            savedSource: sourceByAccount.get(influencer.id) ?? null,
          }))
        );
        setFolders(folderResult.folders.map((folder) => ({ id: folder.id, name: folder.name })));
        setTags(tagResult.tags.map((tag) => ({ id: tag.id, name: tag.name })));
        setFolderPersistenceReady(folderResult.persistenceReady && folderItemResult.persistenceReady);
        setTagPersistenceReady(tagResult.persistenceReady && tagItemResult.persistenceReady);
        setPriorityPersistenceReady(priorityResult.persistenceReady);
        setReadinessPersistenceReady(readinessResult.persistenceReady);
        setRiskPersistenceReady(riskResult.persistenceReady);
        setPricePersistenceReady(riskResult.persistenceReady);
        setContactPersistenceReady(riskResult.persistenceReady);
        setSnapshotPersistenceReady(priorityResult.persistenceReady);
        setResearchChecklistPersistenceReady(priorityResult.persistenceReady);
        setMemoPersistenceReady(memoResult.persistenceReady);
        setSourcePersistenceReady(sourceResult.persistenceReady);
        setRatingPersistenceReady(priorityResult.persistenceReady);
        if (!folderResult.persistenceReady || !folderItemResult.persistenceReady) {
          setFolderError("フォルダーを保存するには、bookmark_folders のマイグレーションをSupabaseへ反映してください。");
        }
        if (!tagResult.persistenceReady || !tagItemResult.persistenceReady) {
          setTagError("タグを保存するには、bookmark_tags のマイグレーションをSupabaseへ反映してください。");
        }
        if (!priorityResult.persistenceReady) {
          setPriorityError("優先度を保存するには、user_bookmarks の priority カラムをSupabaseへ反映してください。");
        }
        if (!readinessResult.persistenceReady) {
          setReadinessError("候補状況を使うには、user_bookmarks の candidate_readiness カラムをSupabaseへ反映してください。");
        }
        if (!riskResult.persistenceReady) {
          setRiskError("リスク情報を使うには、user_bookmarks の risk_level / risk_notes カラムをSupabaseへ反映してください。");
        }
        if (!riskResult.persistenceReady) {
          setPriceError("価格メモを使うには、user_bookmarks の estimated_price_min / estimated_price_max / price_note / price_checked_at カラムをSupabaseへ反映してください。");
        }
        if (!riskResult.persistenceReady) {
          setContactError("連絡先ボールトを使うには、user_bookmarks の contact_info カラムをSupabaseへ反映してください。");
        }
        if (!priorityResult.persistenceReady) {
          setSnapshotError("保存時スナップショットを使うには、user_bookmarks の saved_snapshot カラムをSupabaseへ反映してください。");
        }
        if (!priorityResult.persistenceReady) {
          setResearchChecklistError("チェックリストを使うには、user_bookmarks の research_checklist カラムをSupabaseへ反映してください。");
        }
        if (!memoResult.persistenceReady) {
          setMemoError("保存理由メモを使うには、user_bookmarks の saved_reason カラムをSupabaseへ反映してください。");
        }
        if (!sourceResult.persistenceReady) {
          setSourceError("保存元を記録するには、user_bookmarks の saved_source / saved_source_detail カラムをSupabaseへ反映してください。");
        }
        if (!priorityResult.persistenceReady) {
          setRatingError("候補評価を使うには、user_bookmarks の personal_rating カラムをSupabaseへ反映してください。");
        }
      } catch (bookmarkError) {
        setInfluencers([]);
        setError(bookmarkError instanceof Error ? bookmarkError.message : String(bookmarkError));
      } finally {
        setLoading(false);
      }
    };

    loadBookmarks();
  }, [userId]);

  const handleRatingChange = async ({
    influencer,
    rating,
  }: {
    influencer: BookmarkedInfluencer;
    rating: BookmarkRatingValue | null;
  }) => {
    if (!userId) return;

    if (!ratingPersistenceReady) {
      setRatingError("候補評価を使うには、user_bookmarks の personal_rating カラムをSupabaseへ反映してください。");
      return;
    }
  
    const previousInfluencers = influencers;
    setUpdatingRatingId(influencer.id);
    setRatingError(null);
  
    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencer.id ? { ...row, personalRating: rating } : row
      )
    );
  
    try {
      if (rating) {
        await setBookmarkRating({
          userId,
          accountId: influencer.id,
          rating,
        });
      } else {
        await clearBookmarkRating({
          userId,
          accountId: influencer.id,
        });
      }
    } catch (error) {
      setInfluencers(previousInfluencers);
      setRatingError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingRatingId(null);
    }
  };

  const handleReadinessChange = async ({
    influencer,
    readiness,
  }: {
    influencer: BookmarkedInfluencer;
    readiness: BookmarkReadinessValue;
  }) => {
    if (!userId) return;

    if (!readinessPersistenceReady) {
      setReadinessError("候補状況を使うには、user_bookmarks の candidate_readiness カラムをSupabaseへ反映してください。");
      return;
    }

    const previousInfluencers = influencers;
    setUpdatingReadinessId(influencer.id);
    setReadinessError(null);
    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencer.id ? { ...row, candidateReadiness: readiness } : row
      )
    );

    try {
      await setBookmarkReadiness({
        userId,
        accountId: influencer.id,
        readiness,
      });
    } catch (readinessUpdateError) {
      setInfluencers(previousInfluencers);
      setReadinessError(
        readinessUpdateError instanceof Error
          ? readinessUpdateError.message
          : String(readinessUpdateError)
      );
    } finally {
      setUpdatingReadinessId(null);
    }
  };

  const handleRiskProfileSave = async ({
    influencer,
    riskLevel,
    riskNotes,
  }: {
    influencer: BookmarkedInfluencer;
    riskLevel: BookmarkRiskLevelValue;
    riskNotes: string;
  }) => {
    if (!userId) return false;

    if (!riskPersistenceReady) {
      setRiskError("リスク情報を使うには、user_bookmarks の risk_level / risk_notes カラムをSupabaseへ反映してください。");
      return false;
    }

    const previousInfluencers = influencers;
    setUpdatingRiskId(influencer.id);
    setRiskError(null);

    try {
      const saved = await saveBookmarkRiskProfile({
        userId,
        accountId: influencer.id,
        riskLevel,
        riskNotes,
      });
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id
            ? { ...row, riskLevel: saved.riskLevel, riskNotes: saved.riskNotes }
            : row
        )
      );
      return true;
    } catch (riskSaveError) {
      setInfluencers(previousInfluencers);
      setRiskError(riskSaveError instanceof Error ? riskSaveError.message : String(riskSaveError));
      return false;
    } finally {
      setUpdatingRiskId(null);
    }
  };

  const handlePriceMemorySave = async ({
    influencer,
    priceMemory,
  }: {
    influencer: BookmarkedInfluencer;
    priceMemory: Pick<
      BookmarkPriceMemory,
      "estimated_price_min" | "estimated_price_max" | "price_note"
    >;
  }) => {
    if (!userId) return false;

    if (!pricePersistenceReady) {
      setPriceError("価格メモを使うには、user_bookmarks の estimated_price_min / estimated_price_max / price_note / price_checked_at カラムをSupabaseへ反映してください。");
      return false;
    }

    const previousInfluencers = influencers;
    setUpdatingPriceId(influencer.id);
    setPriceError(null);

    try {
      const saved = await saveBookmarkPriceMemory({
        userId,
        accountId: influencer.id,
        ...priceMemory,
      });
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, priceMemory: saved } : row
        )
      );
      return true;
    } catch (priceSaveError) {
      setInfluencers(previousInfluencers);
      setPriceError(priceSaveError instanceof Error ? priceSaveError.message : String(priceSaveError));
      return false;
    } finally {
      setUpdatingPriceId(null);
    }
  };

  const handleContactInfoSave = async ({
    influencer,
    contactInfo,
  }: {
    influencer: BookmarkedInfluencer;
    contactInfo: BookmarkContactInfo;
  }) => {
    if (!userId) return false;

    if (!contactPersistenceReady) {
      setContactError("連絡先ボールトを使うには、user_bookmarks の contact_info カラムをSupabaseへ反映してください。");
      return false;
    }

    const previousInfluencers = influencers;
    setUpdatingContactId(influencer.id);
    setContactError(null);

    try {
      const saved = await saveBookmarkContactInfo({
        userId,
        accountId: influencer.id,
        contactInfo,
      });
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, contactInfo: saved } : row
        )
      );
      return true;
    } catch (contactSaveError) {
      setInfluencers(previousInfluencers);
      setContactError(contactSaveError instanceof Error ? contactSaveError.message : String(contactSaveError));
      return false;
    } finally {
      setUpdatingContactId(null);
    }
  };

  const handleSavedSnapshotCapture = async ({
    influencer,
  }: {
    influencer: BookmarkedInfluencer;
  }) => {
    if (!userId) return false;

    if (!snapshotPersistenceReady) {
      setSnapshotError("保存時スナップショットを使うには、user_bookmarks の saved_snapshot カラムをSupabaseへ反映してください。");
      return false;
    }

    const snapshot: BookmarkSavedSnapshot = {
      followers: influencer.accounts_metrics?.followers ?? null,
      posts: influencer.accounts_metrics?.posts ?? null,
      maximumLikes: influencer.accounts_metrics?.maximum_likes ?? null,
      metricDate: influencer.accounts_metrics?.metric_date ?? "",
      savedAt: new Date().toISOString(),
    };

    const previousInfluencers = influencers;
    setUpdatingSnapshotId(influencer.id);
    setSnapshotError(null);

    try {
      const saved = await saveBookmarkSavedSnapshot({
        userId,
        accountId: influencer.id,
        snapshot,
      });
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, savedSnapshot: saved } : row
        )
      );
      return true;
    } catch (snapshotSaveError) {
      setInfluencers(previousInfluencers);
      setSnapshotError(
        snapshotSaveError instanceof Error ? snapshotSaveError.message : String(snapshotSaveError)
      );
      return false;
    } finally {
      setUpdatingSnapshotId(null);
    }
  };

  const handleResearchChecklistSave = async ({
    influencer,
    checklist,
  }: {
    influencer: BookmarkedInfluencer;
    checklist: BookmarkResearchChecklist;
  }) => {
    if (!userId) return false;

    if (!researchChecklistPersistenceReady) {
      setResearchChecklistError("チェックリストを使うには、user_bookmarks の research_checklist カラムをSupabaseへ反映してください。");
      return false;
    }

    const previousInfluencers = influencers;
    setUpdatingResearchChecklistId(influencer.id);
    setResearchChecklistError(null);

    try {
      const savedChecklist = await saveBookmarkResearchChecklist({
        userId,
        accountId: influencer.id,
        checklist,
      });
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, researchChecklist: savedChecklist } : row
        )
      );
      return true;
    } catch (researchChecklistSaveError) {
      setInfluencers(previousInfluencers);
      setResearchChecklistError(
        researchChecklistSaveError instanceof Error
          ? researchChecklistSaveError.message
          : String(researchChecklistSaveError)
      );
      return false;
    } finally {
      setUpdatingResearchChecklistId(null);
    }
  };

  const handleToggleBookmark = async (influencer: BookmarkedInfluencer) => {
    if (!userId) return;
  
    const alreadyBookmarked = influencer.hasUserBookmark;
  
    const previousInfluencers = influencers;
  
    setError(null);
  
    setInfluencers((prev) => {
      if (!alreadyBookmarked) {
        return prev.map((row) =>
          row.id === influencer.id ? { ...row, hasUserBookmark: true } : row
        );
      }
  
      return prev.filter((row) => row.id !== influencer.id);
    });
  
    try {
      if (alreadyBookmarked) {
        await removeUserBookmark({
          userId,
          accountId: influencer.id,
        });
      } else {
        await addUserBookmark({
          userId,
          accountId: influencer.id,
        });
      }
    } catch (bookmarkError) {
      setInfluencers(previousInfluencers);
      setError(bookmarkError instanceof Error ? bookmarkError.message : String(bookmarkError));
    }
  };

  const handleCreateTag = async (name: string) => {
    if (!userId) return false;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setTagError("タグ名を入力してください。");
      return false;
    }

    if (!tagPersistenceReady) {
      setTagError("タグを保存するには、bookmark_tags のマイグレーションをSupabaseへ反映してください。");
      return false;
    }

    setCreatingTag(true);
    setTagError(null);

    try {
      const created = await createBookmarkTag({
        userId,
        name: trimmedName,
      });
      setTags((prev) => [...prev, { id: created.id, name: created.name }]);
      return true;
    } catch (tagCreateError) {
      setTagError(tagCreateError instanceof Error ? tagCreateError.message : String(tagCreateError));
      return false;
    } finally {
      setCreatingTag(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (!userId) return false;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFolderError("フォルダー名を入力してください。");
      return false;
    }

    if (!folderPersistenceReady) {
      setFolderError("フォルダーを保存するには、bookmark_folders のマイグレーションをSupabaseへ反映してください。");
      return false;
    }

    setCreatingFolder(true);
    setFolderError(null);

    try {
      const created = await createBookmarkFolder({
        userId,
        name: trimmedName,
      });
      setFolders((prev) => [...prev, { id: created.id, name: created.name }]);
      return true;
    } catch (folderCreateError) {
      setFolderError(
        folderCreateError instanceof Error ? folderCreateError.message : String(folderCreateError)
      );
      return false;
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleToggleTagAssignment = async ({
    influencer,
    tagId,
  }: {
    influencer: BookmarkedInfluencer;
    tagId: number;
  }) => {
    if (!userId) return;

    if (!tagPersistenceReady) {
      setTagError("タグを使うには、bookmark_tags のマイグレーションをSupabaseへ反映してください。");
      return;
    }

    const assignmentKey = `${influencer.id}-${tagId}`;
    const alreadyAssigned = influencer.tagIds.includes(tagId);
    const previousInfluencers = influencers;
    setUpdatingTagAssignment(assignmentKey);
    setTagError(null);

    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencer.id
          ? {
              ...row,
              tagIds: alreadyAssigned
                ? row.tagIds.filter((id) => id !== tagId)
                : [...row.tagIds, tagId],
            }
          : row
      )
    );

    try {
      if (alreadyAssigned) {
        await removeInfluencerFromBookmarkTag({
          userId,
          tagId,
          accountId: influencer.id,
        });
      } else {
        await addInfluencerToBookmarkTag({
          userId,
          tagId,
          accountId: influencer.id,
        });
      }
    } catch (assignmentError) {
      setInfluencers(previousInfluencers);
      setTagError(assignmentError instanceof Error ? assignmentError.message : String(assignmentError));
    } finally {
      setUpdatingTagAssignment(null);
    }
  };

  const handleToggleFolderAssignment = async ({
    influencer,
    folderId,
  }: {
    influencer: BookmarkedInfluencer;
    folderId: number;
  }) => {
    if (!userId) return;

    if (!folderPersistenceReady) {
      setFolderError("フォルダーを使うには、bookmark_folders のマイグレーションをSupabaseへ反映してください。");
      return;
    }

    const assignmentKey = `${influencer.id}-${folderId}`;
    const alreadyAssigned = influencer.folderIds.includes(folderId);
    const previousInfluencers = influencers;
    setUpdatingFolderAssignment(assignmentKey);
    setFolderError(null);

    setInfluencers((prev) =>
      prev.map((row) =>
        row.id === influencer.id
          ? {
              ...row,
              folderIds: alreadyAssigned
                ? row.folderIds.filter((id) => id !== folderId)
                : [...row.folderIds, folderId],
            }
          : row
      )
    );

    try {
      if (alreadyAssigned) {
        await removeInfluencerFromBookmarkFolder({
          userId,
          folderId,
          accountId: influencer.id,
        });
      } else {
        await addInfluencerToBookmarkFolder({
          userId, 
          folderId,
          accountId: influencer.id,
        });
      }
    } catch (assignmentError) {
      setInfluencers(previousInfluencers);
      setFolderError(assignmentError instanceof Error ? assignmentError.message : String(assignmentError));
    } finally {
      setUpdatingFolderAssignment(null);
    }
  };

  const handlePriorityChange = async ({
    influencer,
    priority,
  }: {
    influencer: BookmarkedInfluencer;
    priority: BookmarkPriorityValue | null;
  }) => {
    if (!userId) return;

    if (!priorityPersistenceReady) {
      setPriorityError("優先度を保存するには、user_bookmarks の priority カラムをSupabaseへ反映してください。");
      return;
    }

    const previousInfluencers = influencers;
    setUpdatingPriorityId(influencer.id);
    setPriorityError(null);
    setInfluencers((prev) =>
      prev.map((row) => (row.id === influencer.id ? { ...row, priority } : row))
    );

    try {
      if (priority) {
        await setBookmarkPriority({
          userId,
          accountId: influencer.id,
          priority,
        });
      } else {
        await clearBookmarkPriority({
          userId,
          accountId: influencer.id,
        });
      }
    } catch (priorityUpdateError) {
      setInfluencers(previousInfluencers);
      setPriorityError(
        priorityUpdateError instanceof Error
          ? priorityUpdateError.message
          : String(priorityUpdateError)
      );
    } finally {
      setUpdatingPriorityId(null);
    }
  };

  const handleMemoSave = async ({
    influencer,
    memo,
  }: {
    influencer: BookmarkedInfluencer;
    memo: string;
  }) => {
    if (!userId) return false;

    if (!memoPersistenceReady) {
      setMemoError("保存理由メモを使うには、user_bookmarks の saved_reason カラムをSupabaseへ反映してください。");
      return false;
    }

    const previousInfluencers = influencers;
    setUpdatingMemoId(influencer.id);
    setMemoError(null);

    try {
      const savedMemo = await saveBookmarkMemo({
        userId,
        accountId: influencer.id,
        memo,
      });
      setInfluencers((prev) =>
        prev.map((row) =>
          row.id === influencer.id ? { ...row, whySavedMemo: savedMemo } : row
        )
      );
      return true;
    } catch (memoSaveError) {
      setInfluencers(previousInfluencers);
      setMemoError(memoSaveError instanceof Error ? memoSaveError.message : String(memoSaveError));
      return false;
    } finally {
      setUpdatingMemoId(null);
    }
  };

  const summary = useMemo(() => {
    const totalFollowers = influencers.reduce(
      (sum, influencer) => sum + Math.max(0, influencer.accounts_metrics?.followers ?? 0),
      0
    );
    const totalPosts = influencers.reduce(
      (sum, influencer) => sum + Math.max(0, influencer.accounts_metrics?.posts ?? 0),
      0
    );
    const totalMaxLikes = influencers.reduce(
      (sum, influencer) => sum + Math.max(0, influencer.accounts_metrics?.maximum_likes ?? 0),
      0
    );

    return {
      count: influencers.length,
      totalFollowers,
      totalPosts,
      averageMaxLikes:
        influencers.length > 0 ? Math.round(totalMaxLikes / influencers.length) : 0,
    };
  }, [influencers]);

  const filteredInfluencers = useMemo(() => {
    return influencers.filter((influencer) => {
      const matchesRating =
  selectedRating === "all" || influencer.personalRating === selectedRating;
      const matchesFolder =
        selectedFolderId === "all" || influencer.folderIds.includes(selectedFolderId);
      const matchesTag = selectedTagId === "all" || influencer.tagIds.includes(selectedTagId);
      const matchesPriority =
        selectedPriority === "all" || influencer.priority === selectedPriority;
      const matchesReadiness =
        selectedReadiness === "all" || influencer.candidateReadiness === selectedReadiness;
      const matchesRisk =
        selectedRiskLevel === "all" || influencer.riskLevel === selectedRiskLevel;
      return (
        matchesFolder &&
        matchesTag &&
        matchesPriority &&
        matchesRating &&
        matchesReadiness &&
        matchesRisk
      );
    });
  }, [influencers, selectedFolderId, selectedPriority, selectedRating, selectedReadiness, selectedRiskLevel, selectedTagId]);

  return {
    influencers,
    filteredInfluencers,
    folders,
    tags,
    selectedFolderId,
    selectedTagId,
    selectedPriority,
    selectedReadiness,
    selectedRiskLevel,
    selectedRating,
    loading,
    error,
    folderError,
    tagError,
    priorityError,
    readinessError,
    riskError,
    priceError,
    contactError,
    snapshotError,
    ratingError,
    researchChecklistError,
    memoError,
    sourceError,
    folderPersistenceReady,
    tagPersistenceReady,
    priorityPersistenceReady,
    readinessPersistenceReady,
    riskPersistenceReady,
    pricePersistenceReady,
    contactPersistenceReady,
    snapshotPersistenceReady,
    ratingPersistenceReady,
    researchChecklistPersistenceReady,
    memoPersistenceReady,
    sourcePersistenceReady,
    creatingFolder,
    creatingTag,
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
    summary,
    setSelectedFolderId,
    setSelectedTagId,
    setSelectedPriority,
    setSelectedReadiness,
    setSelectedRiskLevel,
    setSelectedRating,
    handleToggleBookmark,
    handleCreateFolder,
    handleCreateTag,
    handleToggleFolderAssignment,
    handleToggleTagAssignment,
    handlePriorityChange,
    handleReadinessChange,
    handleRiskProfileSave,
    handlePriceMemorySave,
    handleContactInfoSave,
    handleSavedSnapshotCapture,
    handleRatingChange,
    handleResearchChecklistSave,
    handleMemoSave,
  };
};
