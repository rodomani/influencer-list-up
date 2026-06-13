import type { ChangeEvent } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { CreateCampaignFormValues } from "../types";
import { CreateCampaignActions } from "./CreateCampaignActions";
import { CreateCampaignDateRange } from "./CreateCampaignDateRange";
import { CreateCampaignFields } from "./CreateCampaignFields";

type CreateCampaignPanelProps = {
  formValues: CreateCampaignFormValues;
  dateRange: DateRange | undefined;
  error: string | null;
  submitting: boolean;
  onInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof CreateCampaignFormValues
  ) => void;
  onGoalTemplateSelect: (goal: string) => void;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onAddInfluencer: () => void;
  onCreate: () => void;
};

export function CreateCampaignPanel({
  formValues,
  dateRange,
  error,
  submitting,
  onInputChange,
  onGoalTemplateSelect,
  onDateRangeChange,
  onAddInfluencer,
  onCreate,
}: CreateCampaignPanelProps) {
  return (
    <FieldSet className="deco-panel block w-full max-w-none min-w-0 [min-inline-size:0]">
      <FieldLegend className="font-display text-lg">キャンペーン詳細</FieldLegend>
      <CreateCampaignFields
        formValues={formValues}
        onInputChange={onInputChange}
        onGoalTemplateSelect={onGoalTemplateSelect}
      />
      <div className="w-full">
        <Button className="w-full sm:w-auto" onClick={onAddInfluencer}>
          インフルエンサーを追加
        </Button>
      </div>
      <CreateCampaignDateRange
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />
      <CreateCampaignActions
        error={error}
        submitting={submitting}
        onCreate={onCreate}
      />
    </FieldSet>
  );
}
