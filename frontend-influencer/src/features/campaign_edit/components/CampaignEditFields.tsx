import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { CampaignGoalTemplatePicker } from "@/features/campaign_goal_templates/components/CampaignGoalTemplatePicker";
import type { CampaignEditFormValues } from "../types";

type CampaignEditFieldsProps = {
  formValues: CampaignEditFormValues;
  onInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof CampaignEditFormValues
  ) => void;
  onGoalTemplateSelect: (goal: string) => void;
};

export function CampaignEditFields({
  formValues,
  onInputChange,
  onGoalTemplateSelect,
}: CampaignEditFieldsProps) {
  return (
    <FieldGroup className="grid w-full max-w-none min-w-0 gap-5 xl:grid-cols-4">
      <Field>
        <FieldLabel htmlFor="name">キャンペーン名</FieldLabel>
        <Input
          id="name"
          value={formValues.name}
          onChange={(event) => onInputChange(event, "name")}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="description">説明</FieldLabel>
        <Input
          id="description"
          value={formValues.description}
          onChange={(event) => onInputChange(event, "description")}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="budget">予算</FieldLabel>
        <Input
          id="budget"
          type="number"
          value={formValues.budget}
          onChange={(event) => onInputChange(event, "budget")}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="goal">目標</FieldLabel>
        <Input
          id="goal"
          value={formValues.goal}
          onChange={(event) => onInputChange(event, "goal")}
        />
      </Field>
      <div className="xl:col-span-4">
        <CampaignGoalTemplatePicker
          selectedGoal={formValues.goal}
          onSelectGoal={onGoalTemplateSelect}
        />
      </div>
      <Field className="xl:col-span-4">
        <FieldLabel htmlFor="internal_memo">社内メモ</FieldLabel>
        <textarea
          id="internal_memo"
          value={formValues.internal_memo}
          onChange={(event) => onInputChange(event, "internal_memo")}
          className="min-h-36 w-full border border-slate-300 bg-white px-3 py-3 text-sm leading-7 text-slate-950 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          placeholder="交渉内容、社内判断、次回確認事項などを記録できます。"
        />
      </Field>
    </FieldGroup>
  );
}
