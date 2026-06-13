import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "../types";
import { SORT_OPTIONS } from "../logic/sorting";

type SearchResultsSortPanelProps = {
  sortOption: SortOption;
  onSortChange: (value: string) => void;
};

export function SearchResultsSortPanel({
  sortOption,
  onSortChange,
}: SearchResultsSortPanelProps) {
  return (
    <section className="flex flex-col gap-4 border border-slate-200 bg-white p-5 shadow-[0_18px_70px_-58px_rgba(15,23,42,0.28)] lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">
          並び替え
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          フォロワー数、反応率、投稿頻度、最新投稿、活動日、保存数、データ鮮度で候補者を整理できます。
        </p>
      </div>
      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="h-12 w-full border-slate-300 bg-white text-slate-950 lg:w-80">
          <SelectValue placeholder="並び替えを選択" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 bg-white text-slate-900">
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}
