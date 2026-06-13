import { useNavigate, useSearchParams } from "react-router-dom";
import { useInfluencerCompare } from "@/features/influencer_compare/api/useInfluencerCompare";
import { CompareHero } from "@/features/influencer_compare/components/CompareHero";
import { CompareStatus } from "@/features/influencer_compare/components/CompareStatus";
import { CompareSummaryCards } from "@/features/influencer_compare/components/CompareSummaryCards";
import { CompareTable } from "@/features/influencer_compare/components/CompareTable";

export function InfluencerComparePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const compare = useInfluencerCompare(searchParams.get("ids"));

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f9fafb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-none flex-col gap-7">
        <CompareHero onBack={() => navigate(-1)} />

        <CompareStatus loading={compare.loading} error={compare.error} />

        {!compare.loading && !compare.error && compare.influencers.length > 0 && (
          <>
            <CompareSummaryCards influencers={compare.influencers} />

            <CompareTable
              influencers={compare.influencers}
              metrics={compare.metrics}
              bestValues={compare.bestValues}
              bestDates={compare.bestDates}
              onOpenInfluencer={(id) => navigate(`/search/influencer/${id}`)}
            />
          </>
        )}
      </div>
    </div>
  );
}
