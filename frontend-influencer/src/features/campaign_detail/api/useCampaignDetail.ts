import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { updateCampaignStatus } from "@/features/campaign/api/campaignQueries";
import type {
  Campaign,
  CampaignCustomCalendarEvent,
  CampaignInfluencer,
  CampaignRecommendedInfluencer,
  CampaignTask,
} from "../types";
import type {
  CampaignCustomCalendarEventInput,
} from "./campaignCalendarEventQueries";
import {
  createCampaignCustomCalendarEvent,
  deleteCampaignCustomCalendarEvent,
  fetchCampaignCustomCalendarEvents,
} from "./campaignCalendarEventQueries";
import {
  addCampaignInfluencerRelation,
  fetchCampaignInfluencers,
  fetchRecommendationCandidateAccounts,
  removeCampaignInfluencer,
  updateCampaignInfluencerDeliverables,
  updateCampaignInfluencerQuotedPrice,
  updateCampaignInfluencerStatus,
} from "./campaignInfluencerQueries";
import { buildCampaignBudgetAllocation } from "../logic/campaignBudgetAllocation";
import { buildCampaignInfluencerSummary } from "../logic/campaignInfluencerFormatters";
import { buildCampaignPerformanceSummary } from "../logic/campaignPerformance";
import { buildCampaignRecommendations } from "../logic/campaignRecommendations";
import { buildCampaignRoiEfficiency } from "../logic/campaignRoiEfficiency";
import { buildCampaignTimeline } from "../logic/campaignTimeline";
import {
  updateCampaignInternalMemo,
  updateCampaignLegacyInfluencers,
} from "./campaignDetailQueries";
import {
  fetchCampaignTasks,
  updateCampaignTaskCompleted,
} from "./campaignTaskQueries";
import {
  buildCampaignCalendarEvents,
  buildCampaignCalendarMonths,
} from "../logic/campaignCalendar";

type CampaignDetailLocationState = {
  campaign?: Campaign;
};

export const useCampaignDetail = (userId: string | undefined) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [campaign, setCampaign] = useState(
    () => (state as CampaignDetailLocationState | null)?.campaign
  );
  const [campaignInfluencers, setCampaignInfluencers] = useState<CampaignInfluencer[]>([]);
  const [influencersLoading, setInfluencersLoading] = useState(false);
  const [influencersError, setInfluencersError] = useState<string | null>(null);
  const [updatingInfluencerId, setUpdatingInfluencerId] = useState<number | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [recommendedInfluencers, setRecommendedInfluencers] = useState<CampaignRecommendedInfluencer[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [addingRecommendedAccountId, setAddingRecommendedAccountId] = useState<number | null>(null);
  const [campaignTasks, setCampaignTasks] = useState<CampaignTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [taskPersistenceReady, setTaskPersistenceReady] = useState(true);
  const [campaignCustomCalendarEvents, setCampaignCustomCalendarEvents] = useState<CampaignCustomCalendarEvent[]>([]);
  const [customCalendarEventsLoading, setCustomCalendarEventsLoading] = useState(false);
  const [customCalendarEventsError, setCustomCalendarEventsError] = useState<string | null>(null);
  const [customCalendarEventsPersistenceReady, setCustomCalendarEventsPersistenceReady] = useState(true);
  const [creatingCalendarEvent, setCreatingCalendarEvent] = useState(false);
  const [deletingCalendarEventId, setDeletingCalendarEventId] = useState<number | null>(null);

  useEffect(() => {
    const loadInfluencers = async () => {
      if (!campaign?.id) return;
      setInfluencersLoading(true);
      setInfluencersError(null);

      try {
        setCampaignInfluencers(await fetchCampaignInfluencers(campaign.id));
      } catch (error) {
        setInfluencersError(error instanceof Error ? error.message : String(error));
      } finally {
        setInfluencersLoading(false);
      }
    };

    loadInfluencers();
  }, [campaign?.id]);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!campaign?.id) return;
      setRecommendationsLoading(true);
      setRecommendationsError(null);

      try {
        const accounts = await fetchRecommendationCandidateAccounts();
        setRecommendedInfluencers(
          buildCampaignRecommendations({
            campaign,
            accounts,
            excludedAccountIds: campaignInfluencers.map((influencer) => influencer.account_id),
          })
        );
      } catch (error) {
        setRecommendedInfluencers([]);
        setRecommendationsError(error instanceof Error ? error.message : String(error));
      } finally {
        setRecommendationsLoading(false);
      }
    };

    loadRecommendations();
  }, [campaign, campaignInfluencers]);

  useEffect(() => {
    const loadTasks = async () => {
      if (!campaign?.id) return;
      setTasksLoading(true);
      setTasksError(null);

      try {
        const result = await fetchCampaignTasks(campaign.id);
        setCampaignTasks(result.tasks);
        setTaskPersistenceReady(result.persistenceReady);
      } catch (error) {
        setCampaignTasks([]);
        setTasksError(error instanceof Error ? error.message : String(error));
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
  }, [campaign?.id]);

  useEffect(() => {
    const loadCustomCalendarEvents = async () => {
      if (!campaign?.id) return;
      setCustomCalendarEventsLoading(true);
      setCustomCalendarEventsError(null);

      try {
        const result = await fetchCampaignCustomCalendarEvents(campaign.id);
        setCampaignCustomCalendarEvents(result.events);
        setCustomCalendarEventsPersistenceReady(result.persistenceReady);
      } catch (error) {
        setCampaignCustomCalendarEvents([]);
        setCustomCalendarEventsError(error instanceof Error ? error.message : String(error));
      } finally {
        setCustomCalendarEventsLoading(false);
      }
    };

    loadCustomCalendarEvents();
  }, [campaign?.id]);

  const goToCampaignList = () => {
    navigate("/campaign");
  };

  const goToEditCampaign = () => {
    if (!campaign) return;
    navigate("/campaign/edit", { state: { campaign } });
  };

  const handleStatusChange = async (status: string) => {
    if (!campaign) return;
    if (!userId) {
      setStatusError("ログインしてからステータスを変更してね。");
      return;
    }

    const previousStatus = campaign.status;
    setStatusUpdating(true);
    setStatusError(null);
    setCampaign({ ...campaign, status });

    try {
      await updateCampaignStatus({
        campaignId: campaign.id,
        userId,
        status,
      });
    } catch (error) {
      setCampaign({ ...campaign, status: previousStatus });
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleInfluencerStatusChange = async (relationId: number, status: string) => {
    const previous = campaignInfluencers.find((influencer) => influencer.id === relationId);
    if (!previous) return;

    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) =>
      prev.map((influencer) =>
        influencer.id === relationId ? { ...influencer, status } : influencer
      )
    );

    try {
      await updateCampaignInfluencerStatus({ relationId, status });
    } catch (error) {
      setCampaignInfluencers((prev) =>
        prev.map((influencer) => (influencer.id === relationId ? previous : influencer))
      );
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleInfluencerQuotedPriceChange = async (relationId: number, rawValue: string) => {
    const previous = campaignInfluencers.find((influencer) => influencer.id === relationId);
    if (!previous) return;

    const trimmed = rawValue.trim();
    const quotedPrice = trimmed === "" ? null : Number(trimmed);
    if (quotedPrice !== null && (Number.isNaN(quotedPrice) || quotedPrice < 0)) {
      setInfluencersError("見積金額は0以上の数字で入力してね。");
      return;
    }

    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) =>
      prev.map((influencer) =>
        influencer.id === relationId ? { ...influencer, quoted_price: quotedPrice } : influencer
      )
    );

    try {
      await updateCampaignInfluencerQuotedPrice({ relationId, quotedPrice });
    } catch (error) {
      setCampaignInfluencers((prev) =>
        prev.map((influencer) => (influencer.id === relationId ? previous : influencer))
      );
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleInfluencerDeliverablesChange = async ({
    relationId,
    deliverables,
    deliverableStatus,
    deliverableDueDate,
  }: {
    relationId: number;
    deliverables: string;
    deliverableStatus: string;
    deliverableDueDate: string | null;
  }) => {
    const previous = campaignInfluencers.find((influencer) => influencer.id === relationId);
    if (!previous) return;

    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) =>
      prev.map((influencer) =>
        influencer.id === relationId
          ? {
              ...influencer,
              deliverables,
              deliverable_status: deliverableStatus,
              deliverable_due_date: deliverableDueDate,
            }
          : influencer
      )
    );

    try {
      await updateCampaignInfluencerDeliverables({
        relationId,
        deliverables,
        deliverableStatus,
        deliverableDueDate,
      });
    } catch (error) {
      setCampaignInfluencers((prev) =>
        prev.map((influencer) => (influencer.id === relationId ? previous : influencer))
      );
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleRemoveInfluencer = async (relationId: number) => {
    const previous = campaignInfluencers;
    setUpdatingInfluencerId(relationId);
    setInfluencersError(null);
    setCampaignInfluencers((prev) => prev.filter((influencer) => influencer.id !== relationId));

    try {
      await removeCampaignInfluencer(relationId);
    } catch (error) {
      setCampaignInfluencers(previous);
      setInfluencersError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingInfluencerId(null);
    }
  };

  const handleInternalMemoSave = async (internalMemo: string) => {
    if (!campaign) return;
    if (!userId) {
      setMemoError("ログインしてから社内メモを保存してね。");
      return;
    }

    const previousMemo = campaign.internal_memo ?? "";
    setMemoSaving(true);
    setMemoError(null);
    setCampaign({ ...campaign, internal_memo: internalMemo });

    try {
      await updateCampaignInternalMemo({
        campaignId: campaign.id,
        userId,
        internalMemo,
      });
    } catch (error) {
      setCampaign({ ...campaign, internal_memo: previousMemo });
      setMemoError(error instanceof Error ? error.message : String(error));
    } finally {
      setMemoSaving(false);
    }
  };

  const handleAddRecommendedInfluencer = async (accountId: number) => {
    if (!campaign) return;
    if (!userId) {
      setRecommendationsError("ログインしてから候補者を追加してね。");
      return;
    }

    const recommended = recommendedInfluencers.find((influencer) => influencer.id === accountId);
    if (!recommended) return;

    const previousInfluencers = campaignInfluencers;
    const previousCampaign = campaign;
    const nextLegacyInfluencers = campaign.influencers
      ? `${campaign.influencers}, ${recommended.account_name}`
      : recommended.account_name;

    setAddingRecommendedAccountId(accountId);
    setRecommendationsError(null);
    setCampaign({ ...campaign, influencers: nextLegacyInfluencers });

    try {
      await addCampaignInfluencerRelation({
        campaignId: campaign.id,
        accountId,
      });
      await updateCampaignLegacyInfluencers({
        campaignId: campaign.id,
        userId,
        influencers: nextLegacyInfluencers,
      });

      setCampaignInfluencers(await fetchCampaignInfluencers(campaign.id));
    } catch (error) {
      setCampaign(previousCampaign);
      setCampaignInfluencers(previousInfluencers);
      setRecommendationsError(error instanceof Error ? error.message : String(error));
    } finally {
      setAddingRecommendedAccountId(null);
    }
  };

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    const previousTasks = campaignTasks;
    setUpdatingTaskId(taskId);
    setTasksError(null);
    setCampaignTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, completed } : task))
    );

    if (!taskPersistenceReady || taskId < 0) {
      setUpdatingTaskId(null);
      setTasksError("チェックリストを保存するには、campaign_tasks のマイグレーションをSupabaseへ反映してください。");
      return;
    }

    try {
      await updateCampaignTaskCompleted({ taskId, completed });
    } catch (error) {
      setCampaignTasks(previousTasks);
      setTasksError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleCreateCustomCalendarEvent = async ({
    title,
    eventDate,
    eventType,
    description,
  }: Omit<CampaignCustomCalendarEventInput, "campaignId">) => {
    if (!campaign) return false;

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !eventDate) {
      setCustomCalendarEventsError("予定名と日付を入力してね。");
      return false;
    }

    if (!customCalendarEventsPersistenceReady) {
      setCustomCalendarEventsError("予定を保存するには、campaign_calendar_events のマイグレーションをSupabaseへ反映してください。");
      return false;
    }

    setCreatingCalendarEvent(true);
    setCustomCalendarEventsError(null);

    try {
      const created = await createCampaignCustomCalendarEvent({
        campaignId: campaign.id,
        title: trimmedTitle,
        eventDate,
        eventType,
        description,
      });

      setCampaignCustomCalendarEvents((prev) =>
        [...prev, created].sort((a, b) => a.event_date.localeCompare(b.event_date))
      );
      return true;
    } catch (error) {
      setCustomCalendarEventsError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setCreatingCalendarEvent(false);
    }
  };

  const handleDeleteCustomCalendarEvent = async (eventId: number) => {
    const previousEvents = campaignCustomCalendarEvents;
    setDeletingCalendarEventId(eventId);
    setCustomCalendarEventsError(null);
    setCampaignCustomCalendarEvents((prev) => prev.filter((event) => event.id !== eventId));

    try {
      await deleteCampaignCustomCalendarEvent(eventId);
    } catch (error) {
      setCampaignCustomCalendarEvents(previousEvents);
      setCustomCalendarEventsError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingCalendarEventId(null);
    }
  };

  const campaignCalendarEvents = buildCampaignCalendarEvents({
    campaign,
    influencers: campaignInfluencers,
    tasks: campaignTasks,
    customEvents: campaignCustomCalendarEvents,
  });

  return {
    campaign,
    campaignInfluencers,
    campaignBudgetAllocation: buildCampaignBudgetAllocation(campaign, campaignInfluencers),
    campaignInfluencerSummary: buildCampaignInfluencerSummary(campaignInfluencers),
    campaignPerformanceSummary: buildCampaignPerformanceSummary(campaign, campaignInfluencers),
    campaignRoiEfficiency: buildCampaignRoiEfficiency(campaign, campaignInfluencers),
    campaignCalendarEvents,
    campaignCalendarMonths: buildCampaignCalendarMonths(campaignCalendarEvents, campaign),
    campaignTimeline: buildCampaignTimeline(campaign, campaignInfluencers),
    recommendedInfluencers,
    campaignTasks,
    campaignCustomCalendarEvents,
    influencersLoading,
    influencersError,
    recommendationsLoading,
    recommendationsError,
    addingRecommendedAccountId,
    updatingInfluencerId,
    statusUpdating,
    statusError,
    memoSaving,
    memoError,
    tasksLoading,
    tasksError,
    updatingTaskId,
    taskPersistenceReady,
    customCalendarEventsLoading,
    customCalendarEventsError,
    customCalendarEventsPersistenceReady,
    creatingCalendarEvent,
    deletingCalendarEventId,
    goToCampaignList,
    goToEditCampaign,
    handleStatusChange,
    handleInfluencerStatusChange,
    handleInfluencerQuotedPriceChange,
    handleInfluencerDeliverablesChange,
    handleRemoveInfluencer,
    handleInternalMemoSave,
    handleAddRecommendedInfluencer,
    handleTaskToggle,
    handleCreateCustomCalendarEvent,
    handleDeleteCustomCalendarEvent,
  };
};
