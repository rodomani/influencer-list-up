import { supabase } from "@/lib/supabase";
import {
  isMissingSchemaObjectError,
  readableSupabaseError,
  type SupabaseErrorLike,
} from "@/lib/supabaseErrors";
import type { CampaignTask } from "../types";
import {
  DEFAULT_CAMPAIGN_TASK_TITLES,
  buildFallbackCampaignTasks,
} from "../logic/campaignTasks";

const isMissingCampaignTasksTable = (error: unknown) => {
  return isMissingSchemaObjectError((error ?? {}) as SupabaseErrorLike, ["campaign_tasks"]);
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
    .upsert(
      DEFAULT_CAMPAIGN_TASK_TITLES.map((title, index) => ({
        campaign_id: campaignId,
        title,
        position: index + 1,
      })),
      { onConflict: "campaign_id,title" }
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
