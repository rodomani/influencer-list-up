import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CampaignInfluencer, CampaignInfluencerSummary } from "../types";
import {
  campaignDeliverableProgress,
  campaignDeliverableSummary,
} from "../logic/campaignDeliverables";
import {
  campaignInfluencerStatusLabel,
  formatInfluencerMetric,
  latestCampaignInfluencerMetric,
  splitCampaignInfluencerKeywords,
} from "../logic/campaignInfluencerFormatters";
import { CampaignInfluencerDeliverablesEditor } from "./CampaignInfluencerDeliverablesEditor";
import { CampaignInfluencerStatusSelect } from "./CampaignInfluencerStatusSelect";

type CampaignInfluencerManagementProps = {
  influencers: CampaignInfluencer[];
  summary: CampaignInfluencerSummary;
  legacyInfluencers: string | null;
  loading: boolean;
  error: string | null;
  updatingInfluencerId: number | null;
  onStatusChange: (relationId: number, status: string) => void;
  onQuotedPriceChange: (relationId: number, value: string) => void;
  onDeliverablesChange: (payload: {
    relationId: number;
    deliverables: string;
    deliverableStatus: string;
    deliverableDueDate: string | null;
  }) => void;
  onRemove: (relationId: number) => void;
};

export function CampaignInfluencerManagement({
  influencers,
  summary,
  legacyInfluencers,
  loading,
  error,
  updatingInfluencerId,
  onStatusChange,
  onQuotedPriceChange,
  onDeliverablesChange,
  onRemove,
}: CampaignInfluencerManagementProps) {
  const deliverableSummary = campaignDeliverableSummary(influencers);
  const deliverableProgress = campaignDeliverableProgress(influencers);

  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="deco-label">インフルエンサー管理</div>
        <p className="deco-copy text-sm">
          キャンペーンに追加した候補者を、ステータスと主要指標で整理できます。
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="deco-stat min-w-0">
          <div className="deco-label">候補者数</div>
          <div className="mt-2 text-2xl font-black">{formatInfluencerMetric(summary.count)}</div>
        </div>
        <div className="deco-stat min-w-0">
          <div className="deco-label">合計フォロワー</div>
          <div className="mt-2 text-2xl font-black">{formatInfluencerMetric(summary.totalFollowers)}</div>
        </div>
        <div className="deco-stat min-w-0">
          <div className="deco-label">合計投稿数</div>
          <div className="mt-2 text-2xl font-black">{formatInfluencerMetric(summary.totalPosts)}</div>
        </div>
        <div className="deco-stat min-w-0">
          <div className="deco-label">平均最大いいね</div>
          <div className="mt-2 text-2xl font-black">{formatInfluencerMetric(summary.averageMaxLikes)}</div>
        </div>
      </div>

      {influencers.length > 0 && (
        <div className="mt-5 w-full min-w-0 border border-slate-200 bg-[#f9fafb] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="deco-label">納品進捗</p>
              <p className="mt-2 text-sm text-muted-foreground">
                計画済み {deliverableSummary.planned}件 / 期限設定 {deliverableSummary.dueDates}件 / 公開済み {deliverableSummary.posted}件
              </p>
            </div>
            <p className="text-2xl font-black text-slate-950">{deliverableProgress}%</p>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden bg-slate-100">
            <div
              className="h-full bg-[#86b89a] transition-all duration-300"
              style={{ width: `${deliverableProgress}%` }}
            />
          </div>
        </div>
      )}

      {loading && <p className="mt-5 text-sm text-muted-foreground">候補者を読み込み中...</p>}
      {error && <p className="mt-5 text-sm text-red-600">エラー: {error}</p>}

      {!loading && !error && influencers.length === 0 && (
        <div className="deco-stat mt-5">
          <div className="deco-label">登録済み候補者</div>
          <p className="deco-copy mt-2 text-sm">
            まだ候補者が追加されていません。検索結果から「キャンペーンに追加」を押すとここに表示されます。
          </p>
          {legacyInfluencers && (
            <p className="mt-3 text-xs text-muted-foreground">
              旧データ: {legacyInfluencers}
            </p>
          )}
        </div>
      )}

      {influencers.length > 0 && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {influencers.map((influencer) => {
            const account = influencer.account;
            const metrics = latestCampaignInfluencerMetric(account?.accounts_metrics);
            const keywords = splitCampaignInfluencerKeywords(account?.keywords).slice(0, 4);
            const isUpdating = updatingInfluencerId === influencer.id;

            return (
              <article key={influencer.id} className="deco-stat min-w-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    {account?.profile_image_url ? (
                      <img
                        src={account.profile_image_url}
                        alt={`${account.account_name} profile`}
                        className="h-16 w-16 shrink-0 rounded-full border border-[#D4AF37]/50 object-cover p-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-background text-lg font-black uppercase text-muted-foreground">
                        {account?.account_name?.slice(0, 1) ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="deco-label">{account?.platform ?? "未設定"}</div>
                      <h3 className="mt-1 break-words text-lg font-black uppercase tracking-[0.08em]">
                        {account?.account_name ?? `ID: ${influencer.account_id}`}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        状態: {campaignInfluencerStatusLabel(influencer.status)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-40" onClick={(event) => event.stopPropagation()}>
                    <CampaignInfluencerStatusSelect
                      value={influencer.status}
                      disabled={isUpdating}
                      onChange={(status) => onStatusChange(influencer.id, status)}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="deco-label">投稿数</div>
                    <div className="mt-1 font-black">{formatInfluencerMetric(metrics?.posts)}</div>
                  </div>
                  <div>
                    <div className="deco-label">フォロワー</div>
                    <div className="mt-1 font-black">{formatInfluencerMetric(metrics?.followers)}</div>
                  </div>
                  <div>
                    <div className="deco-label">最大いいね</div>
                    <div className="mt-1 font-black">{formatInfluencerMetric(metrics?.maximum_likes)}</div>
                  </div>
                </div>

                <div className="mt-4 grid w-full min-w-0 gap-3 sm:grid-cols-2 sm:items-end">
                  <div>
                    <label
                      htmlFor={`quoted-price-${influencer.id}`}
                      className="deco-label"
                    >
                      見積金額
                    </label>
                    <Input
                      id={`quoted-price-${influencer.id}`}
                      type="number"
                      min={0}
                      defaultValue={influencer.quoted_price ?? ""}
                      disabled={isUpdating}
                      className="mt-2"
                      placeholder="未入力"
                      onBlur={(event) => onQuotedPriceChange(influencer.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    入力後にフォーカスを外すと保存されます。
                  </p>
                </div>

                <CampaignInfluencerDeliverablesEditor
                  influencer={influencer}
                  disabled={isUpdating}
                  onSave={onDeliverablesChange}
                />

                {keywords.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span key={keyword} className="deco-chip">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex w-full justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => onRemove(influencer.id)}
                  >
                    削除
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
