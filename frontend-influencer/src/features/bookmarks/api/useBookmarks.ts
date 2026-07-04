import { useEffect, useMemo, useReducer } from "react";
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

type BookmarkOption = { id: number; name: string };

type BookmarkState = {
  influencers: BookmarkedInfluencer[];
  folders: BookmarkOption[];
  tags: BookmarkOption[];
  selectedFolderId: number | "all";
  selectedTagId: number | "all";
  selectedPriority: BookmarkPriorityValue | "all";
  selectedReadiness: BookmarkReadinessValue | "all";
  selectedRiskLevel: BookmarkRiskLevelValue | "all";
  selectedRating: BookmarkRatingValue | "all";
  loading: boolean;
  error: string | null;
  folderError: string | null;
  tagError: string | null;
  priorityError: string | null;
  readinessError: string | null;
  riskError: string | null;
  priceError: string | null;
  contactError: string | null;
  snapshotError: string | null;
  researchChecklistError: string | null;
  memoError: string | null;
  sourceError: string | null;
  ratingError: string | null;
  folderPersistenceReady: boolean;
  tagPersistenceReady: boolean;
  userBookmarkPersistenceReady: boolean;
  creatingFolder: boolean;
  creatingTag: boolean;
  updatingFolderAssignment: string | null;
  updatingTagAssignment: string | null;
  updatingPriorityId: number | null;
  updatingReadinessId: number | null;
  updatingRiskId: number | null;
  updatingPriceId: number | null;
  updatingContactId: number | null;
  updatingSnapshotId: number | null;
  updatingResearchChecklistId: number | null;
  updatingMemoId: number | null;
  updatingRatingId: number | null;
};

type BookmarkAction =
  | { type: "merge"; patch: Partial<BookmarkState> }
  | { type: "resetForSignedOut" }
  | { type: "setInfluencers"; influencers: BookmarkedInfluencer[] }
  | {
      type: "updateInfluencers";
      updater: (influencers: BookmarkedInfluencer[]) => BookmarkedInfluencer[];
    };

const initialBookmarkState: BookmarkState = {
  influencers: [],
  folders: [],
  tags: [],
  selectedFolderId: "all",
  selectedTagId: "all",
  selectedPriority: "all",
  selectedReadiness: "all",
  selectedRiskLevel: "all",
  selectedRating: "all",
  loading: true,
  error: null,
  folderError: null,
  tagError: null,
  priorityError: null,
  readinessError: null,
  riskError: null,
  priceError: null,
  contactError: null,
  snapshotError: null,
  researchChecklistError: null,
  memoError: null,
  sourceError: null,
  ratingError: null,
  folderPersistenceReady: true,
  tagPersistenceReady: true,
  userBookmarkPersistenceReady: true,
  creatingFolder: false,
  creatingTag: false,
  updatingFolderAssignment: null,
  updatingTagAssignment: null,
  updatingPriorityId: null,
  updatingReadinessId: null,
  updatingRiskId: null,
  updatingPriceId: null,
  updatingContactId: null,
  updatingSnapshotId: null,
  updatingResearchChecklistId: null,
  updatingMemoId: null,
  updatingRatingId: null,
};

const bookmarkFeatureErrorReset: Partial<BookmarkState> = {
  error: null,
  folderError: null,
  tagError: null,
  priorityError: null,
  readinessError: null,
  riskError: null,
  priceError: null,
  contactError: null,
  snapshotError: null,
  researchChecklistError: null,
  memoError: null,
  sourceError: null,
  ratingError: null,
};

const replaceInfluencerRow = (
  influencers: BookmarkedInfluencer[],
  influencerId: number,
  updater: (influencer: BookmarkedInfluencer) => BookmarkedInfluencer
) =>
  influencers.map((influencer) =>
    influencer.id === influencerId ? updater(influencer) : influencer
  );

const findInfluencerSnapshot = (
  influencers: BookmarkedInfluencer[],
  influencerId: number
) => influencers.find((influencer) => influencer.id === influencerId) ?? null;

const bookmarksReducer = (state: BookmarkState, action: BookmarkAction): BookmarkState => {
  switch (action.type) {
    case "merge":
      return { ...state, ...action.patch };
    case "resetForSignedOut":
      return {
        ...initialBookmarkState,
        loading: false,
      };
    case "setInfluencers":
      return {
        ...state,
        influencers: action.influencers,
      };
    case "updateInfluencers":
      return {
        ...state,
        influencers: action.updater(state.influencers),
      };
    default:
      return state;
  }
};

export const useBookmarks = (userId: string | undefined) => {
  const [state, dispatch] = useReducer(bookmarksReducer, initialBookmarkState);
  const setState = (patch: Partial<BookmarkState>) => dispatch({ type: "merge", patch });
  const setInfluencers = (
    influencers:
      | BookmarkedInfluencer[]
      | ((prev: BookmarkedInfluencer[]) => BookmarkedInfluencer[])
  ) =>
    typeof influencers === "function"
      ? dispatch({ type: "updateInfluencers", updater: influencers })
      : dispatch({ type: "setInfluencers", influencers });
  const {
    influencers,
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
    researchChecklistError,
    memoError,
    sourceError,
    ratingError,
    folderPersistenceReady,
    tagPersistenceReady,
    userBookmarkPersistenceReady,
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
    updatingResearchChecklistId,
    updatingMemoId,
    updatingRatingId,
  } = state;
  const setFolders = (next: BookmarkOption[] | ((prev: BookmarkOption[]) => BookmarkOption[])) =>
    setState({ folders: typeof next === "function" ? next(folders) : next });
  const setTags = (next: BookmarkOption[] | ((prev: BookmarkOption[]) => BookmarkOption[])) =>
    setState({ tags: typeof next === "function" ? next(tags) : next });
  const setFilters = (
    patch: Partial<
      Pick<
        BookmarkState,
        | "selectedFolderId"
        | "selectedTagId"
        | "selectedPriority"
        | "selectedReadiness"
        | "selectedRiskLevel"
        | "selectedRating"
      >
    >
  ) => setState(patch);
  const setFeatureErrors = (
    patch: Partial<
      Pick<
        BookmarkState,
        | "error"
        | "folderError"
        | "tagError"
        | "priorityError"
        | "readinessError"
        | "riskError"
        | "priceError"
        | "contactError"
        | "snapshotError"
        | "researchChecklistError"
        | "memoError"
        | "sourceError"
        | "ratingError"
      >
    >
  ) => setState(patch);
  const setPending = (
    patch: Partial<
      Pick<
        BookmarkState,
        | "creatingFolder"
        | "creatingTag"
        | "updatingFolderAssignment"
        | "updatingTagAssignment"
        | "updatingPriorityId"
        | "updatingReadinessId"
        | "updatingRiskId"
        | "updatingPriceId"
        | "updatingContactId"
        | "updatingSnapshotId"
        | "updatingResearchChecklistId"
        | "updatingMemoId"
        | "updatingRatingId"
      >
    >
  ) => setState(patch);
  const setSelectedFolderId = (value: number | "all") => setFilters({ selectedFolderId: value });
  const setSelectedTagId = (value: number | "all") => setFilters({ selectedTagId: value });
  const setSelectedPriority = (value: BookmarkPriorityValue | "all") =>
    setFilters({ selectedPriority: value });
  const setSelectedReadiness = (value: BookmarkReadinessValue | "all") =>
    setFilters({ selectedReadiness: value });
  const setSelectedRiskLevel = (value: BookmarkRiskLevelValue | "all") =>
    setFilters({ selectedRiskLevel: value });
  const setSelectedRating = (value: BookmarkRatingValue | "all") =>
    setFilters({ selectedRating: value });

  const updateSingleInfluencer = (
    influencerId: number,
    updater: (influencer: BookmarkedInfluencer) => BookmarkedInfluencer
  ) => {
    setInfluencers((prev) => replaceInfluencerRow(prev, influencerId, updater));
  };

  const createNamedBookmarkEntity = async ({
    name,
    creatingKey,
    persistenceReady,
    emptyMessage,
    persistenceMessage,
    createEntity,
    onSuccess,
    errorKey,
  }: {
    name: string;
    creatingKey: "creatingFolder" | "creatingTag";
    persistenceReady: boolean;
    emptyMessage: string;
    persistenceMessage: string;
    createEntity: (trimmedName: string) => Promise<{ id: number; name: string }>;
    onSuccess: (entity: { id: number; name: string }) => void;
    errorKey: "folderError" | "tagError";
  }) => {
    if (!userId) return false;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeatureErrors({ [errorKey]: emptyMessage } as Partial<BookmarkState>);
      return false;
    }

    if (!persistenceReady) {
      setFeatureErrors({ [errorKey]: persistenceMessage } as Partial<BookmarkState>);
      return false;
    }

    setPending({ [creatingKey]: true } as Partial<BookmarkState>);
    setFeatureErrors({ [errorKey]: null } as Partial<BookmarkState>);

    try {
      const created = await createEntity(trimmedName);
      onSuccess(created);
      return true;
    } catch (createError) {
      setFeatureErrors({
        [errorKey]: createError instanceof Error ? createError.message : String(createError),
      } as Partial<BookmarkState>);
      return false;
    } finally {
      setPending({ [creatingKey]: false } as Partial<BookmarkState>);
    }
  };

  const toggleBookmarkAssignment = async ({
    influencer,
    entityId,
    entityType,
    persistenceReady,
    persistenceMessage,
    addAssignment,
    removeAssignment,
  }: {
    influencer: BookmarkedInfluencer;
    entityId: number;
    entityType: "folder" | "tag";
    persistenceReady: boolean;
    persistenceMessage: string;
    addAssignment: () => Promise<void>;
    removeAssignment: () => Promise<void>;
  }) => {
    if (!userId) return;

    if (!persistenceReady) {
      setFeatureErrors({
        [entityType === "folder" ? "folderError" : "tagError"]: persistenceMessage,
      } as Partial<BookmarkState>);
      return;
    }

    const assignmentKey = `${influencer.id}-${entityId}`;
    const assignmentField = entityType === "folder" ? "folderIds" : "tagIds";
    const errorKey = entityType === "folder" ? "folderError" : "tagError";
    const pendingKey =
      entityType === "folder" ? "updatingFolderAssignment" : "updatingTagAssignment";
    const alreadyAssigned = influencer[assignmentField].includes(entityId);
    const previousRow = findInfluencerSnapshot(influencers, influencer.id);

    setPending({ [pendingKey]: assignmentKey } as Partial<BookmarkState>);
    setFeatureErrors({ [errorKey]: null } as Partial<BookmarkState>);

    updateSingleInfluencer(influencer.id, (row) => ({
      ...row,
      [assignmentField]: alreadyAssigned
        ? row[assignmentField].filter((id) => id !== entityId)
        : [...row[assignmentField], entityId],
    }));

    try {
      if (alreadyAssigned) {
        await removeAssignment();
      } else {
        await addAssignment();
      }
    } catch (assignmentError) {
      if (previousRow) {
        updateSingleInfluencer(influencer.id, () => previousRow);
      }
      setFeatureErrors({
        [errorKey]:
          assignmentError instanceof Error ? assignmentError.message : String(assignmentError),
      } as Partial<BookmarkState>);
    } finally {
      setPending({ [pendingKey]: null } as Partial<BookmarkState>);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadBookmarks = async () => {
      if (!userId) {
        dispatch({ type: "resetForSignedOut" });
        return;
      }

      setState({
        loading: true,
        ...bookmarkFeatureErrorReset,
      });

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

        if (cancelled) return;

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

        const nextInfluencers = bookmarkedInfluencers.map((influencer) => ({
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
        }));
        const folderPersistenceReady = folderResult.persistenceReady && folderItemResult.persistenceReady;
        const tagPersistenceReady = tagResult.persistenceReady && tagItemResult.persistenceReady;
        const userBookmarkPersistenceReady =
          priorityResult.persistenceReady &&
          readinessResult.persistenceReady &&
          riskResult.persistenceReady &&
          memoResult.persistenceReady &&
          sourceResult.persistenceReady;

        setState({
          loading: false,
          influencers: nextInfluencers,
          folders: folderResult.folders.map((folder) => ({ id: folder.id, name: folder.name })),
          tags: tagResult.tags.map((tag) => ({ id: tag.id, name: tag.name })),
          folderPersistenceReady,
          tagPersistenceReady,
          userBookmarkPersistenceReady,
          folderError: folderPersistenceReady
            ? null
            : "フォルダーを保存するには、bookmark_folders のマイグレーションをSupabaseへ反映してください。",
          tagError: tagPersistenceReady
            ? null
            : "タグを保存するには、bookmark_tags のマイグレーションをSupabaseへ反映してください。",
          priorityError: userBookmarkPersistenceReady
            ? null
            : "優先度を保存するには、user_bookmarks の priority カラムをSupabaseへ反映してください。",
          readinessError: userBookmarkPersistenceReady
            ? null
            : "候補状況を使うには、user_bookmarks の candidate_readiness カラムをSupabaseへ反映してください。",
          riskError: userBookmarkPersistenceReady
            ? null
            : "リスク情報を使うには、user_bookmarks の risk_level / risk_notes カラムをSupabaseへ反映してください。",
          priceError: userBookmarkPersistenceReady
            ? null
            : "価格メモを使うには、user_bookmarks の estimated_price_min / estimated_price_max / price_note / price_checked_at カラムをSupabaseへ反映してください。",
          contactError: userBookmarkPersistenceReady
            ? null
            : "連絡先ボールトを使うには、user_bookmarks の contact_info カラムをSupabaseへ反映してください。",
          snapshotError: userBookmarkPersistenceReady
            ? null
            : "保存時スナップショットを使うには、user_bookmarks の saved_snapshot カラムをSupabaseへ反映してください。",
          researchChecklistError: userBookmarkPersistenceReady
            ? null
            : "チェックリストを使うには、user_bookmarks の research_checklist カラムをSupabaseへ反映してください。",
          memoError: userBookmarkPersistenceReady
            ? null
            : "保存理由メモを使うには、user_bookmarks の saved_reason カラムをSupabaseへ反映してください。",
          sourceError: userBookmarkPersistenceReady
            ? null
            : "保存元を記録するには、user_bookmarks の saved_source / saved_source_detail カラムをSupabaseへ反映してください。",
          ratingError: userBookmarkPersistenceReady
            ? null
            : "候補評価を使うには、user_bookmarks の personal_rating カラムをSupabaseへ反映してください。",
        });
      } catch (bookmarkError) {
        if (cancelled) return;
        setState({
          loading: false,
          influencers: [],
          error: bookmarkError instanceof Error ? bookmarkError.message : String(bookmarkError),
        });
      }
    };

    loadBookmarks();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleRatingChange = async ({
    influencer,
    rating,
  }: {
    influencer: BookmarkedInfluencer;
    rating: BookmarkRatingValue | null;
  }) => {
    if (!userId) return;

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        ratingError:
          "候補評価を使うには、user_bookmarks の personal_rating カラムをSupabaseへ反映してください。",
      });
      return;
    }

    const previousRow = findInfluencerSnapshot(influencers, influencer.id);
    setPending({ updatingRatingId: influencer.id });
    setFeatureErrors({ ratingError: null });
    updateSingleInfluencer(influencer.id, (row) => ({ ...row, personalRating: rating }));

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
      if (previousRow) {
        updateSingleInfluencer(influencer.id, () => previousRow);
      }
      setFeatureErrors({ ratingError: error instanceof Error ? error.message : String(error) });
    } finally {
      setPending({ updatingRatingId: null });
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

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        readinessError:
          "候補状況を使うには、user_bookmarks の candidate_readiness カラムをSupabaseへ反映してください。",
      });
      return;
    }

    const previousRow = findInfluencerSnapshot(influencers, influencer.id);
    setPending({ updatingReadinessId: influencer.id });
    setFeatureErrors({ readinessError: null });
    updateSingleInfluencer(influencer.id, (row) => ({ ...row, candidateReadiness: readiness }));

    try {
      await setBookmarkReadiness({
        userId,
        accountId: influencer.id,
        readiness,
      });
    } catch (readinessUpdateError) {
      if (previousRow) {
        updateSingleInfluencer(influencer.id, () => previousRow);
      }
      setFeatureErrors({
        readinessError:
        readinessUpdateError instanceof Error
          ? readinessUpdateError.message
          : String(readinessUpdateError),
      });
    } finally {
      setPending({ updatingReadinessId: null });
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

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        riskError:
          "リスク情報を使うには、user_bookmarks の risk_level / risk_notes カラムをSupabaseへ反映してください。",
      });
      return false;
    }

    setPending({ updatingRiskId: influencer.id });
    setFeatureErrors({ riskError: null });

    try {
      const saved = await saveBookmarkRiskProfile({
        userId,
        accountId: influencer.id,
        riskLevel,
        riskNotes,
      });
      updateSingleInfluencer(influencer.id, (row) => ({
        ...row,
        riskLevel: saved.riskLevel,
        riskNotes: saved.riskNotes,
      }));
      return true;
    } catch (riskSaveError) {
      setFeatureErrors({
        riskError: riskSaveError instanceof Error ? riskSaveError.message : String(riskSaveError),
      });
      return false;
    } finally {
      setPending({ updatingRiskId: null });
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

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        priceError:
          "価格メモを使うには、user_bookmarks の estimated_price_min / estimated_price_max / price_note / price_checked_at カラムをSupabaseへ反映してください。",
      });
      return false;
    }

    setPending({ updatingPriceId: influencer.id });
    setFeatureErrors({ priceError: null });

    try {
      const saved = await saveBookmarkPriceMemory({
        userId,
        accountId: influencer.id,
        ...priceMemory,
      });
      updateSingleInfluencer(influencer.id, (row) => ({ ...row, priceMemory: saved }));
      return true;
    } catch (priceSaveError) {
      setFeatureErrors({
        priceError:
          priceSaveError instanceof Error ? priceSaveError.message : String(priceSaveError),
      });
      return false;
    } finally {
      setPending({ updatingPriceId: null });
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

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        contactError:
          "連絡先ボールトを使うには、user_bookmarks の contact_info カラムをSupabaseへ反映してください。",
      });
      return false;
    }

    setPending({ updatingContactId: influencer.id });
    setFeatureErrors({ contactError: null });

    try {
      const saved = await saveBookmarkContactInfo({
        userId,
        accountId: influencer.id,
        contactInfo,
      });
      updateSingleInfluencer(influencer.id, (row) => ({ ...row, contactInfo: saved }));
      return true;
    } catch (contactSaveError) {
      setFeatureErrors({
        contactError:
          contactSaveError instanceof Error ? contactSaveError.message : String(contactSaveError),
      });
      return false;
    } finally {
      setPending({ updatingContactId: null });
    }
  };

  const handleSavedSnapshotCapture = async ({
    influencer,
  }: {
    influencer: BookmarkedInfluencer;
  }) => {
    if (!userId) return false;

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        snapshotError:
          "保存時スナップショットを使うには、user_bookmarks の saved_snapshot カラムをSupabaseへ反映してください。",
      });
      return false;
    }

    const snapshot: BookmarkSavedSnapshot = {
      followers: influencer.accounts_metrics?.followers ?? null,
      posts: influencer.accounts_metrics?.posts ?? null,
      maximumLikes: influencer.accounts_metrics?.maximum_likes ?? null,
      metricDate: influencer.accounts_metrics?.metric_date ?? "",
      savedAt: new Date().toISOString(),
    };

    setPending({ updatingSnapshotId: influencer.id });
    setFeatureErrors({ snapshotError: null });

    try {
      const saved = await saveBookmarkSavedSnapshot({
        userId,
        accountId: influencer.id,
        snapshot,
      });
      updateSingleInfluencer(influencer.id, (row) => ({ ...row, savedSnapshot: saved }));
      return true;
    } catch (snapshotSaveError) {
      setFeatureErrors({
        snapshotError:
          snapshotSaveError instanceof Error
            ? snapshotSaveError.message
            : String(snapshotSaveError),
      });
      return false;
    } finally {
      setPending({ updatingSnapshotId: null });
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

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        researchChecklistError:
          "チェックリストを使うには、user_bookmarks の research_checklist カラムをSupabaseへ反映してください。",
      });
      return false;
    }

    setPending({ updatingResearchChecklistId: influencer.id });
    setFeatureErrors({ researchChecklistError: null });

    try {
      const savedChecklist = await saveBookmarkResearchChecklist({
        userId,
        accountId: influencer.id,
        checklist,
      });
      updateSingleInfluencer(influencer.id, (row) => ({
        ...row,
        researchChecklist: savedChecklist,
      }));
      return true;
    } catch (researchChecklistSaveError) {
      setFeatureErrors({
        researchChecklistError:
          researchChecklistSaveError instanceof Error
            ? researchChecklistSaveError.message
            : String(researchChecklistSaveError),
      });
      return false;
    } finally {
      setPending({ updatingResearchChecklistId: null });
    }
  };

  const handleToggleBookmark = async (influencer: BookmarkedInfluencer) => {
    if (!userId) return;

    const alreadyBookmarked = influencer.hasUserBookmark;
    const previousRow = findInfluencerSnapshot(influencers, influencer.id);
    const previousIndex = influencers.findIndex((row) => row.id === influencer.id);

    setFeatureErrors({ error: null });

    setInfluencers((prev) => {
      if (!alreadyBookmarked) {
        return replaceInfluencerRow(prev, influencer.id, (row) => ({
          ...row,
          hasUserBookmark: true,
        }));
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
      if (alreadyBookmarked && previousRow && previousIndex >= 0) {
        setInfluencers((prev) => {
          const next = [...prev];
          next.splice(previousIndex, 0, previousRow);
          return next;
        });
      } else if (previousRow) {
        updateSingleInfluencer(influencer.id, () => previousRow);
      }
      setFeatureErrors({
        error: bookmarkError instanceof Error ? bookmarkError.message : String(bookmarkError),
      });
    }
  };

  const handleCreateTag = async (name: string) => {
    return createNamedBookmarkEntity({
      name,
      creatingKey: "creatingTag",
      persistenceReady: tagPersistenceReady,
      emptyMessage: "タグ名を入力してください。",
      persistenceMessage:
        "タグを保存するには、bookmark_tags のマイグレーションをSupabaseへ反映してください。",
      createEntity: async (trimmedName) => createBookmarkTag({ userId: userId!, name: trimmedName }),
      onSuccess: (created) => setTags((prev) => [...prev, { id: created.id, name: created.name }]),
      errorKey: "tagError",
    });
  };

  const handleCreateFolder = async (name: string) => {
    return createNamedBookmarkEntity({
      name,
      creatingKey: "creatingFolder",
      persistenceReady: folderPersistenceReady,
      emptyMessage: "フォルダー名を入力してください。",
      persistenceMessage:
        "フォルダーを保存するには、bookmark_folders のマイグレーションをSupabaseへ反映してください。",
      createEntity: async (trimmedName) =>
        createBookmarkFolder({ userId: userId!, name: trimmedName }),
      onSuccess: (created) =>
        setFolders((prev) => [...prev, { id: created.id, name: created.name }]),
      errorKey: "folderError",
    });
  };

  const handleToggleTagAssignment = async ({
    influencer,
    tagId,
  }: {
    influencer: BookmarkedInfluencer;
    tagId: number;
  }) => {
    await toggleBookmarkAssignment({
      influencer,
      entityId: tagId,
      entityType: "tag",
      persistenceReady: tagPersistenceReady,
      persistenceMessage:
        "タグを使うには、bookmark_tags のマイグレーションをSupabaseへ反映してください。",
      addAssignment: () =>
        addInfluencerToBookmarkTag({
          userId: userId!,
          tagId,
          accountId: influencer.id,
        }),
      removeAssignment: () =>
        removeInfluencerFromBookmarkTag({
          userId: userId!,
          tagId,
          accountId: influencer.id,
        }),
    });
  };

  const handleToggleFolderAssignment = async ({
    influencer,
    folderId,
  }: {
    influencer: BookmarkedInfluencer;
    folderId: number;
  }) => {
    await toggleBookmarkAssignment({
      influencer,
      entityId: folderId,
      entityType: "folder",
      persistenceReady: folderPersistenceReady,
      persistenceMessage:
        "フォルダーを使うには、bookmark_folders のマイグレーションをSupabaseへ反映してください。",
      addAssignment: () =>
        addInfluencerToBookmarkFolder({
          userId: userId!,
          folderId,
          accountId: influencer.id,
        }),
      removeAssignment: () =>
        removeInfluencerFromBookmarkFolder({
          userId: userId!,
          folderId,
          accountId: influencer.id,
        }),
    });
  };

  const handlePriorityChange = async ({
    influencer,
    priority,
  }: {
    influencer: BookmarkedInfluencer;
    priority: BookmarkPriorityValue | null;
  }) => {
    if (!userId) return;

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        priorityError:
          "優先度を保存するには、user_bookmarks の priority カラムをSupabaseへ反映してください。",
      });
      return;
    }

    const previousRow = findInfluencerSnapshot(influencers, influencer.id);
    setPending({ updatingPriorityId: influencer.id });
    setFeatureErrors({ priorityError: null });
    updateSingleInfluencer(influencer.id, (row) => ({ ...row, priority }));

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
      if (previousRow) {
        updateSingleInfluencer(influencer.id, () => previousRow);
      }
      setFeatureErrors({
        priorityError:
          priorityUpdateError instanceof Error
            ? priorityUpdateError.message
            : String(priorityUpdateError),
      });
    } finally {
      setPending({ updatingPriorityId: null });
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

    if (!userBookmarkPersistenceReady) {
      setFeatureErrors({
        memoError:
          "保存理由メモを使うには、user_bookmarks の saved_reason カラムをSupabaseへ反映してください。",
      });
      return false;
    }

    setPending({ updatingMemoId: influencer.id });
    setFeatureErrors({ memoError: null });

    try {
      const savedMemo = await saveBookmarkMemo({
        userId,
        accountId: influencer.id,
        memo,
      });
      updateSingleInfluencer(influencer.id, (row) => ({ ...row, whySavedMemo: savedMemo }));
      return true;
    } catch (memoSaveError) {
      setFeatureErrors({
        memoError: memoSaveError instanceof Error ? memoSaveError.message : String(memoSaveError),
      });
      return false;
    } finally {
      setPending({ updatingMemoId: null });
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
    const influencersWithMaxLikes = influencers.filter(
      (influencer) => influencer.accounts_metrics?.maximum_likes != null
    );

    return {
      count: influencers.length,
      totalFollowers,
      totalPosts,
      averageMaxLikes:
        influencersWithMaxLikes.length > 0
          ? Math.round(totalMaxLikes / influencersWithMaxLikes.length)
          : 0,
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
  }, [
    influencers,
    selectedFolderId,
    selectedPriority,
    selectedRating,
    selectedReadiness,
    selectedRiskLevel,
    selectedTagId,
  ]);

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
    priorityPersistenceReady: userBookmarkPersistenceReady,
    readinessPersistenceReady: userBookmarkPersistenceReady,
    riskPersistenceReady: userBookmarkPersistenceReady,
    pricePersistenceReady: userBookmarkPersistenceReady,
    contactPersistenceReady: userBookmarkPersistenceReady,
    snapshotPersistenceReady: userBookmarkPersistenceReady,
    ratingPersistenceReady: userBookmarkPersistenceReady,
    researchChecklistPersistenceReady: userBookmarkPersistenceReady,
    memoPersistenceReady: userBookmarkPersistenceReady,
    sourcePersistenceReady: userBookmarkPersistenceReady,
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
