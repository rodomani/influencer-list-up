import { Button } from "@/components/ui/button";
import type { CampaignRecommendedInfluencer } from "../types";
import {
  formatInfluencerMetric,
  splitCampaignInfluencerKeywords,
} from "../logic/campaignInfluencerFormatters";

type CampaignRecommendedInfluencersPanelProps = {
  recommendations: CampaignRecommendedInfluencer[];
  loading: boolean;
  error: string | null;
  addingAccountId: number | null;
  onAdd: (accountId: number) => void;
};

export function CampaignRecommendedInfluencersPanel({
  recommendations,
  loading,
  error,
  addingAccountId,
  onAdd,
}: CampaignRecommendedInfluencersPanelProps) {
  return (
    <section className="deco-panel w-full max-w-none min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="deco-label">おすすめ候補</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-slate-950">
            キャンペーン向け推薦
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            キャンペーン目標、キーワード、フォロワー、投稿数、最大いいね数から候補者を自動で並べます。
          </p>
        </div>
      </div>

      {loading && (
        <div className="deco-stat mt-5 text-sm text-muted-foreground">
          おすすめ候補を読み込み中...
        </div>
      )}

      {error && (
        <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          エラー: {error}
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="deco-stat mt-5">
          <p className="deco-label">候補なし</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            現在の条件で追加できるおすすめ候補がありません。検索ページから候補者を追加するか、キャンペーン目標を詳しく入力してください。
          </p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {recommendations.map((influencer) => {
            const keywords = splitCampaignInfluencerKeywords(influencer.keywords).slice(0, 3);
            const isAdding = addingAccountId === influencer.id;

            return (
              <article key={influencer.id} className="deco-stat flex min-w-0 flex-col gap-4">
                <div className="flex items-start gap-4">
                  {influencer.profile_image_url ? (
                    <img
                      src={influencer.profile_image_url}
                      alt={`${influencer.account_name} profile`}
                      className="h-16 w-16 shrink-0 rounded-full border border-[#D4AF37]/50 object-cover p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black uppercase text-slate-400">
                      {influencer.account_name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="deco-label">{influencer.platform}</p>
                    <h3 className="mt-1 break-words text-lg font-black uppercase tracking-[0.08em] text-slate-950">
                      {influencer.account_name}
                    </h3>
                    <p className="mt-2 text-sm font-black text-[#046307]">
                      推薦スコア {influencer.recommendationScore}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-y border-slate-200 py-4">
                  <div>
                    <p className="deco-label">投稿数</p>
                    <p className="mt-1 font-black">
                      {formatInfluencerMetric(influencer.latestMetric?.posts)}
                    </p>
                  </div>
                  <div>
                    <p className="deco-label">フォロワー</p>
                    <p className="mt-1 font-black">
                      {formatInfluencerMetric(influencer.latestMetric?.followers)}
                    </p>
                  </div>
                  <div>
                    <p className="deco-label">最大いいね</p>
                    <p className="mt-1 font-black">
                      {formatInfluencerMetric(influencer.latestMetric?.maximum_likes)}
                    </p>
                  </div>
                </div>

                {influencer.recommendationReasons.length > 0 && (
                  <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                    {influencer.recommendationReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span key={keyword} className="deco-chip">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  className="mt-auto w-full"
                  disabled={isAdding}
                  onClick={() => onAdd(influencer.id)}
                >
                  {isAdding ? "追加中..." : "キャンペーンに追加"}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
