import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Campaign } from "../types";
import { buildCampaignBudgetAllocation } from "../logic/campaignBudgetAllocation";
import { buildCampaignInfluencerSummary } from "../logic/campaignInfluencerFormatters";
import { buildCampaignPerformanceSummary } from "../logic/campaignPerformance";
import { buildCampaignRoiEfficiency } from "../logic/campaignRoiEfficiency";
import { buildCampaignTimeline } from "../logic/campaignTimeline";
import {
  buildCampaignCalendarEvents,
  buildCampaignCalendarMonths,
} from "../logic/campaignCalendar";
import { useCampaignInfluencers } from "./useCampaignInfluencers";
import { useCampaignRecommendations } from "./useCampaignRecommendations";
import { useCampaignTasks } from "./useCampaignTasks";
import { useCampaignCalendarEvents } from "./useCampaignCalendarEvents";
import { useCampaignStatus } from "./useCampaignStatus";
import { useCampaignMemo } from "./useCampaignMemo";

type CampaignDetailLocationState = {
  campaign?: Campaign;
};

export const useCampaignDetail = (userId: string | undefined) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [campaign, setCampaign] = useState(
    () => (state as CampaignDetailLocationState | null)?.campaign
  );

  const {
    campaignInfluencers,
    influencersLoading,
    influencersError,
    updatingInfluencerId,
    reloadInfluencers,
    handleInfluencerStatusChange,
    handleInfluencerQuotedPriceChange,
    handleInfluencerDeliverablesChange,
    handleRemoveInfluencer,
  } = useCampaignInfluencers({
    campaignId: campaign?.id,
    userId,
  });

  const {
    recommendedInfluencers,
    recommendationsLoading,
    recommendationsError,
    addingRecommendedAccountId,
    handleAddRecommendedInfluencer,
  } = useCampaignRecommendations({
    campaign,
    campaignInfluencers,
    userId,
    reloadInfluencers,
  });

  const {
    campaignTasks,
    tasksLoading,
    tasksError,
    updatingTaskId,
    taskPersistenceReady,
    handleTaskToggle,
  } = useCampaignTasks(campaign?.id);

  const {
    campaignCustomCalendarEvents,
    customCalendarEventsLoading,
    customCalendarEventsError,
    customCalendarEventsPersistenceReady,
    creatingCalendarEvent,
    deletingCalendarEventId,
    handleCreateCustomCalendarEvent,
    handleDeleteCustomCalendarEvent,
  } = useCampaignCalendarEvents({
    campaignId: campaign?.id,
    userId,
  });

  const { statusUpdating, statusError, handleStatusChange } = useCampaignStatus({
    campaign,
    userId,
    setCampaign,
  });

  const { memoSaving, memoError, handleInternalMemoSave } = useCampaignMemo({
    campaign,
    userId,
    setCampaign,
  });

  const goToCampaignList = () => {
    navigate("/campaign");
  };

  const goToEditCampaign = () => {
    if (!campaign) return;
    navigate("/campaign/edit", { state: { campaign } });
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
