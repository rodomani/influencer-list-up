import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { FieldGroup } from "@/components/ui/field";

type CampaignEditDateRangeProps = {
  dateRange: DateRange | undefined;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
};
export function CampaignEditDateRange({
  dateRange,
  onDateRangeChange,
}: CampaignEditDateRangeProps) {
  return (
    <FieldGroup className="w-full min-w-0 flex-col items-start gap-4">
      <div>
        <p className="deco-label">期間</p>
        <p className="text-xs text-muted-foreground">
          開始日と終了日を選んでね。
        </p>
      </div>
      <div className="w-full min-w-0 border bg-white p-4 shadow-sm">
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          className="w-full"
          classNames={{
            root: "w-full",
            months: "grid w-full gap-4 grid-cols-1 xl:grid-cols-2",
            month: "flex w-full min-w-0 flex-col gap-4",
            month_caption: "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
            nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
            table: "w-full border-collapse",
            weekdays: "flex w-full",
            week: "mt-2 flex w-full",
            weekday: "flex-1 select-none rounded-md text-[0.8rem] font-normal text-muted-foreground",
            day: "relative aspect-square h-full w-full select-none p-0 text-center",
          }}
        />
      </div>
    </FieldGroup>
  );
}
