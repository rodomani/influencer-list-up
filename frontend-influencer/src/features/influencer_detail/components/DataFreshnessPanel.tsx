import { Button } from "@/components/ui/button";
import type { MetricsRow, PostActivitySummary, RefreshJobRun } from "../types";
import { formatDateTime, formatDateYmd } from "../logic/formatters";
import {
  isActiveRefreshStatus,
  refreshFailureMonitoring,
  refreshMaxRetries,
  refreshRetryCount,
  refreshStatusClassName,
  refreshStatusLabel,
  safeRefreshFailureMessage,
} from "../logic/refreshJobs";

type FreshnessState = {
  label: string;
  age: string;
  className: string;
  barClassName: string;
  progress: number;
};

type DataFreshnessPanelProps = {
  freshness: FreshnessState;
  freshestDate: string | null;
  latestMetrics: MetricsRow | null;
  postActivity: PostActivitySummary | null;
  profileUpdatedAt: string | null;
  refreshing: boolean;
  refreshJob: RefreshJobRun | null;
  refreshJobError: string | null;
  refreshMessage: string | null;
  refreshError: string | null;
  onRefresh: () => void;
};

export function DataFreshnessPanel({
  freshness,
  freshestDate,
  latestMetrics,
  postActivity,
  profileUpdatedAt,
  refreshing,
  refreshJob,
  refreshJobError,
  refreshMessage,
  refreshError,
  onRefresh,
}: DataFreshnessPanelProps) {
  const retryCount = refreshRetryCount(refreshJob?.details);
  const maxRetries = refreshMaxRetries(refreshJob?.details);

  return (
    <section className={`border p-5 ${freshness.className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em]">データ鮮度</div>
          <div className="mt-2 text-3xl font-black uppercase tracking-[0.08em]">
            {freshness.label}
          </div>
        </div>
        <div className="text-right text-sm font-bold leading-7">
          <div>{freshness.age}</div>
          <div>基準日: {formatDateYmd(freshestDate)}</div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border border-white/70 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-bold leading-7 text-slate-700">
          <div>表示中のインフルエンサーだけを再取得します。</div>
        </div>
        <Button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || isActiveRefreshStatus(refreshJob?.status)}
          className="h-auto min-h-11 whitespace-normal bg-[#046307] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-[#034d06]"
        >
          {refreshing
            ? "取得リクエスト中..."
            : isActiveRefreshStatus(refreshJob?.status)
              ? "更新処理中"
              : "最新データを取得"}
        </Button>
      </div>
      <div className={`mt-3 border px-4 py-3 ${refreshStatusClassName(refreshJob?.status)}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em]">更新ジョブ</div>
            <div className="mt-1 text-2xl font-black uppercase tracking-[0.08em]">
              {refreshStatusLabel(refreshJob?.status)}
            </div>
          </div>
          <div className="text-sm font-bold leading-7 sm:text-right">
            <div>開始: {formatDateTime(refreshJob?.started_at ?? refreshJob?.created_at)}</div>
            <div>終了: {formatDateTime(refreshJob?.finished_at)}</div>
            <div>
              再試行回数: {new Intl.NumberFormat("ja-JP").format(retryCount)}
              {maxRetries !== null && maxRetries >= 0
                ? ` / ${new Intl.NumberFormat("ja-JP").format(maxRetries)}`
                : ""}
            </div>
            {typeof refreshJob?.rows_written === "number" && (
              <div>更新件数: {new Intl.NumberFormat("ja-JP").format(refreshJob.rows_written)}</div>
            )}
          </div>
        </div>
        {isActiveRefreshStatus(refreshJob?.status) && (
          <p className="mt-3 text-sm font-bold opacity-80">
            cronワーカーが処理中です。完了または失敗まで自動で状態を確認します。
          </p>
        )}
        {refreshJob?.status === "failed" && (
          <div className="mt-3 space-y-2 border border-red-200 bg-white/75 px-3 py-2 text-sm font-bold text-red-700">
            <p className="break-words">失敗理由: {safeRefreshFailureMessage(refreshJob)}</p>
            {refreshFailureMonitoring(refreshJob.details)?.retryable === true && (
              <p className="text-xs text-red-600">再試行可能なエラーです。時間をおいて再度更新できます。</p>
            )}
            {refreshFailureMonitoring(refreshJob.details)?.retryable === false && (
              <p className="text-xs text-red-600">再試行前にアカウント名、URL、または設定の確認が必要です。</p>
            )}
            {refreshFailureMonitoring(refreshJob.details)?.provider_run_id && (
              <p className="break-words text-xs text-red-500">
                技術ID: {refreshFailureMonitoring(refreshJob.details)?.provider_run_id}
              </p>
            )}
          </div>
        )}
        {refreshJob?.status === "skipped" && (
          <p className="mt-3 text-sm font-bold opacity-80">
            同じアカウントの更新ジョブがすでに処理対象だったためスキップされました。
          </p>
        )}
      </div>
      {refreshJobError && (
        <div className="mt-3 border border-red-200 bg-white/75 px-4 py-3 text-sm font-bold text-red-700">
          更新ジョブの取得エラー: {refreshJobError}
        </div>
      )}
      {refreshMessage && (
        <div className="mt-3 border border-[#046307]/20 bg-white/75 px-4 py-3 text-sm font-bold text-[#046307]">
          {refreshMessage}
        </div>
      )}
      {refreshError && (
        <div className="mt-3 border border-red-200 bg-white/75 px-4 py-3 text-sm font-bold text-red-700">
          更新エラー: {refreshError}
        </div>
      )}
      <div className="mt-5 h-2 overflow-hidden bg-white/80">
        <div className={`h-full ${freshness.barClassName}`} style={{ width: `${freshness.progress}%` }} />
      </div>
      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>指標更新: {formatDateYmd(latestMetrics?.metric_date ?? null)}</div>
        <div>最新投稿日: {formatDateYmd(postActivity?.latest_posted_at ?? null)}</div>
        <div>活動日: {formatDateYmd(postActivity?.latest_activity_at ?? null)}</div>
        <div>プロフィール更新: {formatDateYmd(profileUpdatedAt)}</div>
      </div>
    </section>
  );
}
