import { campaignTaskProgress } from "../logic/campaignTasks";
import type { CampaignTask } from "../types";

type CampaignTaskChecklistPanelProps = {
  tasks: CampaignTask[];
  loading: boolean;
  error: string | null;
  updatingTaskId: number | null;
  persistenceReady: boolean;
  onToggle: (taskId: number, completed: boolean) => void;
};

export function CampaignTaskChecklistPanel({
  tasks,
  loading,
  error,
  updatingTaskId,
  persistenceReady,
  onToggle,
}: CampaignTaskChecklistPanelProps) {
  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = campaignTaskProgress(tasks);

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">タスクチェックリスト</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            進行管理
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            連絡、見積、投稿確認、公開後の振り返りまで、キャンペーン運用の抜け漏れを確認できます。
          </p>
        </div>
        <div className="min-w-36 border border-slate-200 bg-[#f9fafb] px-4 py-3 text-right">
          <p className="deco-label">完了率</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{progress}%</p>
        </div>
      </div>

      <div className="mt-5 h-2 w-full overflow-hidden bg-slate-100">
        <div
          className="h-full bg-[#86b89a] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {completedCount} / {tasks.length} 件完了
        </span>
        {!persistenceReady && (
          <span>保存するにはSupabaseマイグレーションの反映が必要です。</span>
        )}
      </div>

      {loading && (
        <div className="deco-stat mt-5 text-sm text-muted-foreground">
          チェックリストを読み込み中...
        </div>
      )}

      {error && (
        <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => {
            const isUpdating = updatingTaskId === task.id;
            const isDisabled = isUpdating || !persistenceReady || task.id < 0;

            return (
              <label
                key={task.id}
                className={`flex items-start gap-4 border p-4 transition ${
                  task.completed
                    ? "border-[#86b89a] bg-[#f5fbf7]"
                    : "border-slate-200 bg-white hover:border-[#D4AF37]/70"
                } ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  disabled={isDisabled}
                  onChange={(event) => onToggle(task.id, event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#86b89a]"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-black tracking-[0.06em] ${
                      task.completed ? "text-slate-500 line-through" : "text-slate-950"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {task.completed ? "完了済み" : "未完了"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
