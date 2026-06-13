import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { Dispatch, SetStateAction } from "react";
import type { RangeFilterConfig } from "../types";
import { RANGE_MAX, RANGE_MIN } from "../logic/searchPageConstants";
import { formatRangeValue } from "../logic/searchPageFormatters";

type SearchRangeFiltersProps = {
  rangeFilters: RangeFilterConfig[];
  onRangeInputChange: (
    nextRaw: number,
    index: 0 | 1,
    current: number[],
    setter: Dispatch<SetStateAction<number[]>>
  ) => void;
};

export function SearchRangeFilters({
  rangeFilters,
  onRangeInputChange,
}: SearchRangeFiltersProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {rangeFilters.map((item) => (
        <div key={item.key} className="border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatRangeValue(item.value[0])} - {formatRangeValue(item.value[1])}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={RANGE_MIN}
              max={RANGE_MAX}
              value={item.value[0]}
              onChange={(event) =>
                onRangeInputChange(Number(event.target.value), 0, item.value, item.setter)
              }
              className="h-11 border-slate-300 bg-white text-slate-950"
            />
            <span className="text-slate-400">-</span>
            <Input
              type="number"
              inputMode="numeric"
              min={RANGE_MIN}
              max={RANGE_MAX}
              value={item.value[1]}
              onChange={(event) =>
                onRangeInputChange(Number(event.target.value), 1, item.value, item.setter)
              }
              className="h-11 border-slate-300 bg-white text-slate-950"
            />
          </div>
          <Slider
            value={item.value}
            onValueChange={item.setter}
            max={RANGE_MAX}
            min={RANGE_MIN}
            step={10}
            className="mt-5 w-full accent-[#046307]"
            aria-label={item.label}
          />
        </div>
      ))}
    </div>
  );
}
