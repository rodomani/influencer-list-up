import { Button } from "@/components/ui/button";

type SearchSubmitRowProps = {
  onSearch: () => void;
};

export function SearchSubmitRow({ onSearch }: SearchSubmitRowProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-slate-500">
        条件を広めに設定すると、比較しやすい候補者リストを作れます。
      </p>
      <Button
        onClick={onSearch}
        className="h-12 min-w-48 bg-[#046307] px-8 font-black uppercase tracking-[0.16em] text-white hover:bg-[#034d06]"
      >
        検索する
      </Button>
    </div>
  );
}
