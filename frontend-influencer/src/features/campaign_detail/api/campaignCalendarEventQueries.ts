import { supabase } from "@/lib/supabase";
import {
  isMissingSchemaObjectError,
  readableSupabaseError,
  type SupabaseErrorLike,
} from "@/lib/supabaseErrors";
import type { CampaignCustomCalendarEvent } from "../types";
import type { CampaignCalendarEventType } from "../types";

const CAMPAIGN_EVENT_TYPES: CampaignCalendarEventType[] = [
  "campaign",
  "review",
  "influencer",
  "deliverable",
  "task",
  "custom",
];

export type CampaignCustomCalendarEventInput = {
  campaignId: number | string;
  title: string;
  eventDate: string;
  eventType: CampaignCalendarEventType;
  description: string;
};

export type CampaignCustomCalendarEventsResult = {
  events: CampaignCustomCalendarEvent[];
  persistenceReady: boolean;
};

const isMissingCalendarEventsTable = (error: SupabaseErrorLike) =>
  isMissingSchemaObjectError(error, ["campaign_calendar_events"]);

const assertCampaignOwnership = async ({
  campaignId,
  userId,
}: {
  campaignId: number | string;
  userId: string;
}) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(readableSupabaseError(error));
  if (!data) throw new Error("このキャンペーン予定を更新する権限がありません。");
};

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
  userId,
  title,
  eventDate,
  eventType,
  description,
}: CampaignCustomCalendarEventInput & { userId: string }): Promise<CampaignCustomCalendarEvent> => {
  await assertCampaignOwnership({ campaignId, userId });

  if (!CAMPAIGN_EVENT_TYPES.includes(eventType)) {
    throw new Error("無効な予定タイプです。");
  }

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

export const deleteCampaignCustomCalendarEvent = async ({
  eventId,
  campaignId,
  userId,
}: {
  eventId: number;
  campaignId: number | string;
  userId: string;
}) => {
  await assertCampaignOwnership({ campaignId, userId });

  const { error } = await supabase
    .from("campaign_calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("campaign_id", campaignId);

  if (error) {
    if (isMissingCalendarEventsTable(error)) {
      throw new Error("予定を削除するには、campaign_calendar_events のマイグレーションをSupabaseへ反映してください。");
    }

    throw new Error(readableSupabaseError(error));
  }
};
