import { useEffect, useState } from "react";
import type { CampaignCalendarEventType, CampaignCustomCalendarEvent } from "../types";
import {
  createCampaignCustomCalendarEvent,
  deleteCampaignCustomCalendarEvent,
  fetchCampaignCustomCalendarEvents,
} from "./campaignCalendarEventQueries";

export const useCampaignCalendarEvents = ({
  campaignId,
  userId,
}: {
  campaignId: number | string | undefined;
  userId: string | undefined;
}) => {
  const [campaignCustomCalendarEvents, setCampaignCustomCalendarEvents] = useState<
    CampaignCustomCalendarEvent[]
  >([]);
  const [customCalendarEventsLoading, setCustomCalendarEventsLoading] = useState(false);
  const [customCalendarEventsError, setCustomCalendarEventsError] = useState<string | null>(null);
  const [customCalendarEventsPersistenceReady, setCustomCalendarEventsPersistenceReady] =
    useState(true);
  const [creatingCalendarEvent, setCreatingCalendarEvent] = useState(false);
  const [deletingCalendarEventId, setDeletingCalendarEventId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCustomCalendarEvents = async () => {
      if (!campaignId) {
        if (!cancelled) {
          setCampaignCustomCalendarEvents([]);
          setCustomCalendarEventsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setCustomCalendarEventsLoading(true);
        setCustomCalendarEventsError(null);
      }

      try {
        const result = await fetchCampaignCustomCalendarEvents(campaignId);
        if (!cancelled) {
          setCampaignCustomCalendarEvents(result.events);
          setCustomCalendarEventsPersistenceReady(result.persistenceReady);
        }
      } catch (error) {
        if (!cancelled) {
          setCampaignCustomCalendarEvents([]);
          setCustomCalendarEventsError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setCustomCalendarEventsLoading(false);
        }
      }
    };

    loadCustomCalendarEvents();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleCreateCustomCalendarEvent = async ({
    title,
    eventDate,
    eventType,
    description,
  }: {
    title: string;
    eventDate: string;
    eventType: CampaignCalendarEventType;
    description: string;
  }) => {
    if (!campaignId) return false;
    if (!userId) {
      setCustomCalendarEventsError("ログインしてから予定を保存してね。");
      return false;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !eventDate) {
      setCustomCalendarEventsError("予定名と日付を入力してね。");
      return false;
    }

    if (!customCalendarEventsPersistenceReady) {
      setCustomCalendarEventsError(
        "予定を保存するには、campaign_calendar_events のマイグレーションをSupabaseへ反映してください。"
      );
      return false;
    }

    setCreatingCalendarEvent(true);
    setCustomCalendarEventsError(null);

    try {
      const created = await createCampaignCustomCalendarEvent({
        campaignId,
        userId,
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
    if (!campaignId || !userId) {
      setCustomCalendarEventsError("ログインしてから予定を削除してね。");
      return;
    }

    const previousEvents = campaignCustomCalendarEvents;
    setDeletingCalendarEventId(eventId);
    setCustomCalendarEventsError(null);
    setCampaignCustomCalendarEvents((prev) => prev.filter((event) => event.id !== eventId));

    try {
      await deleteCampaignCustomCalendarEvent({
        eventId,
        campaignId,
        userId,
      });
    } catch (error) {
      setCampaignCustomCalendarEvents(previousEvents);
      setCustomCalendarEventsError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingCalendarEventId(null);
    }
  };

  return {
    campaignCustomCalendarEvents,
    customCalendarEventsLoading,
    customCalendarEventsError,
    customCalendarEventsPersistenceReady,
    creatingCalendarEvent,
    deletingCalendarEventId,
    handleCreateCustomCalendarEvent,
    handleDeleteCustomCalendarEvent,
  };
};
