import { Button } from "@/components/ui/button";

type SearchResultsHeaderProps = {
  resultCount: number;
  selectedCount: number;
  compareLimit: number;
  onBackToSearch: () => void;
};

export function SearchResultsHeader({
  resultCount,
  selectedCount,
  compareLimit,
  onBackToSearch,
}: SearchResultsHeaderProps) {
  return (
    <section className="w-full border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.35)] sm:px-8 lg:px-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            検索結果
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.14em] text-slate-950 sm:text-4xl lg:text-5xl">
            候補者一覧
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {resultCount}件の候補者を、プロフィール情報、プラットフォーム、主要指標で比較できます。
          </p>
          <div className="mt-5 flex w-fit max-w-full flex-wrap gap-2 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-black text-slate-950">比較選択:</span>
            <span>
              {selectedCount} / {compareLimit}人
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onBackToSearch}
          className="h-auto min-h-12 w-full whitespace-normal border-slate-300 bg-white px-6 py-3 text-center font-black uppercase leading-tight tracking-[0.14em] text-slate-900 hover:border-[#D4AF37] hover:bg-white sm:w-auto"
        >
          検索に戻る
        </Button>
      </div>
    </section>
  );
}
