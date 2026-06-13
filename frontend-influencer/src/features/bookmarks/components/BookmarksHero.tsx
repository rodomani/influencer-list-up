import { Button } from "@/components/ui/button";

type BookmarksHeroProps = {
  onBackToSearch: () => void;
};

export function BookmarksHero({ onBackToSearch }: BookmarksHeroProps) {
  return (
    <section className="deco-hero flex w-full max-w-none min-w-0 flex-wrap items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="deco-kicker">保存リスト</p>
        <h1 className="section-title mt-3">ブックマーク</h1>
        <p className="section-subtitle">
          保存した候補者を、プロフィール、更新日、主要指標で比較します。
        </p>
      </div>
      <Button className="w-full sm:w-auto" variant="outline" onClick={onBackToSearch}>
        検索に戻る
      </Button>
    </section>
  );
}
