import { supabase } from "@/lib/supabase";
import type { CampaignTask } from "../types";
import {
  DEFAULT_CAMPAIGN_TASK_TITLES,
  buildFallbackCampaignTasks,
} from "../logic/campaignTasks";

const readableSupabaseError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    return [
      typeof maybeError.message === "string" ? maybeError.message : null,
      typeof maybeError.details === "string" ? maybeError.details : null,
      typeof maybeError.hint === "string" ? maybeError.hint : null,
      typeof maybeError.code === "string" ? `code: ${maybeError.code}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return "不明なエラーが発生しました。";
};

const isMissingCampaignTasksTable = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "PGRST205" &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes("campaign_tasks")
  );
};

export const fetchCampaignTasks = async (campaignId: number | string) => {
  const { data, error } = await supabase
    .from("campaign_tasks")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("position", { ascending: true });

  if (error) {
    if (isMissingCampaignTasksTable(error)) {
      return {
        tasks: buildFallbackCampaignTasks(campaignId),
        persistenceReady: false,
      };
    }
    throw new Error(readableSupabaseError(error));
  }

  const existingTasks = (data as CampaignTask[]) ?? [];
  if (existingTasks.length > 0) {
    return {
      tasks: existingTasks,
      persistenceReady: true,
    };
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("campaign_tasks")
    .insert(
      DEFAULT_CAMPAIGN_TASK_TITLES.map((title, index) => ({
        campaign_id: campaignId,
        title,
        position: index + 1,
      }))
    )
    .select("*")
    .order("position", { ascending: true });

  if (insertError) throw new Error(readableSupabaseError(insertError));

  return {
    tasks: (insertedData as CampaignTask[]) ?? [],
    persistenceReady: true,
  };
};

export const updateCampaignTaskCompleted = async ({
  taskId,
  completed,
}: {
  taskId: number;
  completed: boolean;
}) => {
  const { error } = await supabase
    .from("campaign_tasks")
    .update({
      completed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw new Error(readableSupabaseError(error));
};
