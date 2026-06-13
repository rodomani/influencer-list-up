type SearchPageHeroProps = {
  platformCount: number;
  keywordCount: number;
  campaignCount: number;
};

export function SearchPageHero({
  platformCount,
  keywordCount,
  campaignCount,
}: SearchPageHeroProps) {
  return (
    <section className="w-full max-w-full overflow-hidden border border-slate-200 bg-white px-5 py-8 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.35)] sm:px-8 lg:px-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            検索コンソール
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.14em] text-slate-950 sm:text-4xl lg:text-5xl">
            インフルエンサー検索
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            プラットフォーム、キーワード、指標を組み合わせて、候補者を広い視野で絞り込みます。
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 text-center sm:grid-cols-3 lg:w-auto">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">プラットフォーム</p>
            <p className="mt-1 text-lg font-black text-slate-950">{platformCount}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">キーワード</p>
            <p className="mt-1 text-lg font-black text-slate-950">{keywordCount}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">キャンペーン</p>
            <p className="mt-1 text-lg font-black text-slate-950">{campaignCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
