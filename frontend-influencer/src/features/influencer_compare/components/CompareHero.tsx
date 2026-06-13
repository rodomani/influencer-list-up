import { Button } from "@/components/ui/button";

type CompareHeroProps = {
  onBack: () => void;
};

export function CompareHero({ onBack }: CompareHeroProps) {
  return (
    <section className="w-full border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.35)] sm:px-8 lg:px-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            比較モード
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.14em] text-slate-950 sm:text-4xl lg:text-5xl">
            候補者比較
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            選択したインフルエンサーを横並びで比較し、主要指標とプロフィール情報を一目で確認できます。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-auto min-h-12 w-full whitespace-normal border-slate-300 bg-white px-6 py-3 text-center font-black uppercase leading-tight tracking-[0.14em] text-slate-900 hover:border-[#D4AF37] hover:bg-white sm:w-auto"
        >
          結果に戻る
        </Button>
      </div>
    </section>
  );
}
