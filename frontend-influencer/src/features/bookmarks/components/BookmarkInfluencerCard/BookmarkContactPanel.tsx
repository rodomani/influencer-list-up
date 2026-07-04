import type { BookmarkContactInfo, BookmarkedInfluencer } from "../../types";
import { BookmarkContactVault } from "../BookmarkContactVault";

type BookmarkContactPanelProps = {
  influencer: BookmarkedInfluencer;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (payload: {
    influencer: BookmarkedInfluencer;
    contactInfo: BookmarkContactInfo;
  }) => Promise<boolean>;
};

export function BookmarkContactPanel({
  influencer,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkContactPanelProps) {
  return (
    <BookmarkContactVault
      value={influencer.contactInfo}
      updating={updating}
      error={error}
      persistenceReady={persistenceReady}
      onSave={(contactInfo) =>
        onSave({
          influencer,
          contactInfo,
        })
      }
    />
  );
}
