import type { MetricsRow } from "../types";

type RawMetricsPanelProps = {
  latestMetrics: MetricsRow | null;
};

export function RawMetricsPanel({ latestMetrics }: RawMetricsPanelProps) {
  return (
    <section>
      <div className="deco-label mb-3">指標</div>
      <div className="deco-grid">
        <div className="deco-stat">
          <div className="deco-label">投稿数</div>
          <div className="deco-value">{latestMetrics?.posts ?? "未設定"}</div>
        </div>
        <div className="deco-stat">
          <div className="deco-label">フォロワー</div>
          <div className="deco-value">{latestMetrics?.followers ?? "未設定"}</div>
        </div>
        <div className="deco-stat">
          <div className="deco-label">最大いいね</div>
          <div className="deco-value">{latestMetrics?.maximum_likes ?? "未設定"}</div>
        </div>
      </div>
    </section>
  );
}
