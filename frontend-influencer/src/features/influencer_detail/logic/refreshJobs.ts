import type { RefreshFailureMonitoring, RefreshJobRun } from "../types";

export const refreshStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case "queued":
      return "待機中";
    case "running":
      return "実行中";
    case "completed":
      return "完了";
    case "failed":
      return "失敗";
    case "skipped":
      return "スキップ";
    default:
      return "未取得";
  }
};

export const refreshStatusClassName = (status: string | null | undefined) => {
  switch (status) {
    case "queued":
      return "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-slate-900";
    case "running":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "completed":
      return "border-[#046307]/25 bg-[#046307]/5 text-[#046307]";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    case "skipped":
      return "border-slate-200 bg-slate-50 text-slate-500";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
};

export const isActiveRefreshStatus = (status: string | null | undefined) =>
  status === "queued" || status === "running";

export const refreshFailureMonitoring = (
  details: Record<string, unknown> | null | undefined
): RefreshFailureMonitoring | null => {
  const monitoring = details?.failure_monitoring;
  if (!monitoring || typeof monitoring !== "object") return null;
  return monitoring as RefreshFailureMonitoring;
};

export const refreshRetryCount = (
  details: Record<string, unknown> | null | undefined
) => {
  const value = details?.retry_count;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
};

export const refreshMaxRetries = (
  details: Record<string, unknown> | null | undefined
) => {
  const value = details?.max_retries;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(value, -1);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(parsed, -1);
  }
  return null;
};

export const safeRefreshFailureMessage = (job: RefreshJobRun | null) => {
  const monitoring = refreshFailureMonitoring(job?.details);
  if (monitoring?.user_message) return monitoring.user_message;

  const raw = job?.error_message ?? "";
  if (!raw) return "更新ジョブが失敗しました。ログを確認してください。";
  if (/apify|actor|run ID|run-failed/i.test(raw)) {
    return "外部データ取得処理が失敗しました。時間をおいて再試行するか、アカウント情報を確認してください。";
  }
  return raw;
};
