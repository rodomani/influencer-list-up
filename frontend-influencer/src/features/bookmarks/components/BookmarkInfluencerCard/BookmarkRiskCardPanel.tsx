import type { BookmarkedInfluencer, BookmarkRiskLevelValue } from "../../types";
import { BookmarkRiskProfile } from "../BookmarkRiskProfile";

type BookmarkRiskCardPanelProps = {
  influencer: BookmarkedInfluencer;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (payload: {
    influencer: BookmarkedInfluencer;
    riskLevel: BookmarkRiskLevelValue;
    riskNotes: string;
  }) => Promise<boolean>;
};

export function BookmarkRiskCardPanel({
  influencer,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkRiskCardPanelProps) {
  return (
    <BookmarkRiskProfile
      riskLevel={influencer.riskLevel}
      riskNotes={influencer.riskNotes}
      updating={updating}
      error={error}
      persistenceReady={persistenceReady}
      onSave={({ riskLevel, riskNotes }) =>
        onSave({
          influencer,
          riskLevel,
          riskNotes,
        })
      }
    />
  );
}
