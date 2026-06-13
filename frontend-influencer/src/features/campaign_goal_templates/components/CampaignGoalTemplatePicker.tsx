import { Button } from "@/components/ui/button";
import { CAMPAIGN_GOAL_TEMPLATES } from "../logic/campaignGoalTemplates";

type CampaignGoalTemplatePickerProps = {
  selectedGoal: string;
  onSelectGoal: (goal: string) => void;
};

export function CampaignGoalTemplatePicker({
  selectedGoal,
  onSelectGoal,
}: CampaignGoalTemplatePickerProps) {
  return (
    <div className="border border-slate-200 bg-[#f9fafb] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="deco-label">目標テンプレート</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            キャンペーンの目的に近い型を選ぶと、目標文をすぐに入力できます。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CAMPAIGN_GOAL_TEMPLATES.map((template) => {
          const isSelected = selectedGoal === template.goal;

          return (
            <button
              key={template.id}
              type="button"
              className={`border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#D4AF37] ${
                isSelected
                  ? "border-[#046307] bg-white ring-2 ring-[#046307]/15"
                  : "border-slate-200 bg-white"
              }`}
              onClick={() => onSelectGoal(template.goal)}
            >
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">
                {template.label}
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                {template.description}
              </span>
            </button>
          );
        })}
      </div>

      {selectedGoal && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onSelectGoal("")}
          >
            目標をクリア
          </Button>
        </div>
      )}
    </div>
  );
}
