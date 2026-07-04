import type { BookmarkPriceMemory, BookmarkedInfluencer } from "../../types";
import { BookmarkPriceMemory as BookmarkPriceMemoryPanel } from "../BookmarkPriceMemory";

type BookmarkPricePanelProps = {
  influencer: BookmarkedInfluencer;
  updating: boolean;
  error: string | null;
  persistenceReady: boolean;
  onSave: (payload: {
    influencer: BookmarkedInfluencer;
    priceMemory: Pick<
      BookmarkPriceMemory,
      "estimated_price_min" | "estimated_price_max" | "price_note"
    >;
  }) => Promise<boolean>;
};

export function BookmarkPricePanel({
  influencer,
  updating,
  error,
  persistenceReady,
  onSave,
}: BookmarkPricePanelProps) {
  return (
    <BookmarkPriceMemoryPanel
      value={influencer.priceMemory}
      updating={updating}
      error={error}
      persistenceReady={persistenceReady}
      onSave={(priceMemory) =>
        onSave({
          influencer,
          priceMemory,
        })
      }
    />
  );
}
