import { Button } from "@/components/ui/button";

type CreateCampaignActionsProps = {
  error: string | null;
  submitting: boolean;
  onCreate: () => void;
};

export function CreateCampaignActions({
  error,
  submitting,
  onCreate,
}: CreateCampaignActionsProps) {
  return (
    <>
      {error && (
        <p className="border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button variant="outline" onClick={onCreate} disabled={submitting}>
        {submitting ? "作成中..." : "作成する"}
      </Button>
    </>
  );
}
