import { supabase } from "@/lib/supabase";
import type { CampaignCustomCalendarEvent } from "../types";

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export type CampaignCustomCalendarEventInput = {
  campaignId: number | string;
  title: string;
  eventDate: string;
  eventType: string;
  description: string;
};

export type CampaignCustomCalendarEventsResult = {
  events: CampaignCustomCalendarEvent[];
  persistenceReady: boolean;
};

const isMissingCalendarEventsTable = (error: SupabaseErrorLike) =>
  error.code === "PGRST205" ||
  error.message?.includes("campaign_calendar_events") ||
  error.details?.includes("campaign_calendar_events");

const readableSupabaseError = (error: SupabaseErrorLike) =>
  [error.message, error.details, error.hint, error.code].filter(Boolean).join(" / ");

export const fetchCampaignCustomCalendarEvents = async (
  campaignId: number | string
): Promise<CampaignCustomCalendarEventsResult> => {
  const { data, error } = await supabase
    .from("campaign_calendar_events")
    .select("id, campaign_id, title, event_date, event_type, description, created_at, updated_at")
    .eq("campaign_id", campaignId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingCalendarEventsTable(error)) {
      return { events: [], persistenceReady: false };
    }

    throw new Error(readableSupabaseError(error));
  }

  return {
    events: (data ?? []) as CampaignCustomCalendarEvent[],
    persistenceReady: true,
  };
};

export const createCampaignCustomCalendarEvent = async ({
  campaignId,
  title,
  eventDate,
  eventType,
  description,
}: CampaignCustomCalendarEventInput): Promise<CampaignCustomCalendarEvent> => {
  const { data, error } = await supabase
    .from("campaign_calendar_events")
    .insert({
      campaign_id: campaignId,
      title,
      event_date: eventDate,
      event_type: eventType,
      description: description.trim() || null,
    })
    .select("id, campaign_id, title, event_date, event_type, description, created_at, updated_at")
    .single();

  if (error) {
    if (isMissingCalendarEventsTable(error)) {
      throw new Error("予定を保存するには、campaign_calendar_events のマイグレーションをSupabaseへ反映してください。");
    }

    throw new Error(readableSupabaseError(error));
  }

  return data as CampaignCustomCalendarEvent;
};

export const deleteCampaignCustomCalendarEvent = async (eventId: number) => {
  const { error } = await supabase
    .from("campaign_calendar_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    if (isMissingCalendarEventsTable(error)) {
      throw new Error("予定を削除するには、campaign_calendar_events のマイグレーションをSupabaseへ反映してください。");
    }

    throw new Error(readableSupabaseError(error));
  }
};
