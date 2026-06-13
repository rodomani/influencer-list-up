import type { ChangeEvent } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { CampaignEditFormValues } from "../types";
import { CampaignEditActions } from "./CampaignEditActions";
import { CampaignEditDateRange } from "./CampaignEditDateRange";
import { CampaignEditFields } from "./CampaignEditFields";

type CampaignEditPanelProps = {
  formValues: CampaignEditFormValues;
  dateRange: DateRange | undefined;
  error: string | null;
  submitting: boolean;
  onInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof CampaignEditFormValues
  ) => void;
  onGoalTemplateSelect: (goal: string) => void;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onAddInfluencer: () => void;
  onUpdate: () => void;
};

export function CampaignEditPanel({
  formValues,
  dateRange,
  error,
  submitting,
  onInputChange,
  onGoalTemplateSelect,
  onDateRangeChange,
  onAddInfluencer,
  onUpdate,
}: CampaignEditPanelProps) {
  return (
    <FieldSet className="deco-panel block w-full max-w-none min-w-0 [min-inline-size:0]">
      <FieldLegend className="font-display text-lg">キャンペーン詳細</FieldLegend>
      <CampaignEditFields
        formValues={formValues}
        onInputChange={onInputChange}
        onGoalTemplateSelect={onGoalTemplateSelect}
      />
      <div className="w-full">
        <Button className="w-full sm:w-auto" onClick={onAddInfluencer}>
          インフルエンサーを追加
        </Button>
      </div>
      <CampaignEditDateRange
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />
      <CampaignEditActions
        error={error}
        submitting={submitting}
        onUpdate={onUpdate}
      />
    </FieldSet>
  );
}
