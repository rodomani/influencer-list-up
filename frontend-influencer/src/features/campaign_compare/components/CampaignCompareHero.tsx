import { Button } from "@/components/ui/button";

type CampaignCompareHeroProps = {
  comparedCount: number;
  onBack: () => void;
};

export function CampaignCompareHero({ comparedCount, onBack }: CampaignCompareHeroProps) {
  return (
    <section className="deco-hero flex w-full flex-wrap items-center justify-between gap-6">
      <div>
        <p className="deco-kicker">キャンペーン比較</p>
        <h1 className="section-title mt-3">比較ダッシュボード</h1>
        <p className="section-subtitle">
          {comparedCount}件のキャンペーンを、予算・候補者・想定リーチ・反応率の目安で横並びに確認できます。
        </p>
      </div>
      <Button variant="outline" onClick={onBack}>
        一覧に戻る
      </Button>
    </section>
  );
}
