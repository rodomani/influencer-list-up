import { useEffect, useState } from "react";
import type { CampaignTask } from "../types";
import { fetchCampaignTasks, updateCampaignTaskCompleted } from "./campaignTaskQueries";

export const useCampaignTasks = (campaignId: number | string | undefined) => {
  const [campaignTasks, setCampaignTasks] = useState<CampaignTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [taskPersistenceReady, setTaskPersistenceReady] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      if (!campaignId) {
        if (!cancelled) {
          setCampaignTasks([]);
          setTasksLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setTasksLoading(true);
        setTasksError(null);
      }

      try {
        const result = await fetchCampaignTasks(campaignId);
        if (!cancelled) {
          setCampaignTasks(result.tasks);
          setTaskPersistenceReady(result.persistenceReady);
        }
      } catch (error) {
        if (!cancelled) {
          setCampaignTasks([]);
          setTasksError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    if (!taskPersistenceReady || taskId < 0) {
      setTasksError(
        "チェックリストを保存するには、campaign_tasks のマイグレーションをSupabaseへ反映してください。"
      );
      return;
    }

    const previousTasks = campaignTasks;
    setUpdatingTaskId(taskId);
    setTasksError(null);
    setCampaignTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, completed } : task))
    );

    try {
      await updateCampaignTaskCompleted({ taskId, completed });
    } catch (error) {
      setCampaignTasks(previousTasks);
      setTasksError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return {
    campaignTasks,
    tasksLoading,
    tasksError,
    updatingTaskId,
    taskPersistenceReady,
    handleTaskToggle,
  };
};
