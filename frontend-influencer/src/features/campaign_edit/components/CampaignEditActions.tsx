import { Button } from "@/components/ui/button";

type CampaignEditActionsProps = {
  error: string | null;
  submitting: boolean;
  onUpdate: () => void;
};

export function CampaignEditActions({
  error,
  submitting,
  onUpdate,
}: CampaignEditActionsProps) {
  return (
    <>
      {error && (
        <p className="border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button variant="outline" onClick={onUpdate} disabled={submitting}>
        {submitting ? "更新中..." : "更新する"}
      </Button>
    </>
  );
}
