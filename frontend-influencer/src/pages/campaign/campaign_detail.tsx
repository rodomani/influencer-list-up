import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

type Campaign = {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  budget: number | null
  goal: string | null
  influencers: string | null
  status: string | null 
}

export function CampaignDetailScreen() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const campaign: Campaign | undefined = state?.campaign

  if (!campaign) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">No campaign data. Go back and select a campaign.</p>
        <Button variant="outline" onClick={() => navigate("/campaign")}>
          Back to Campaigns
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate("/campaign")}>
        Back to Campaigns
      </Button>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold leading-tight">{campaign.name}</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            {campaign.status ?? "draft"}
          </span>
        </div>
        {campaign.description && (
          <p className="text-base text-foreground">{campaign.description}</p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Dates</p>
            <p className="text-sm text-foreground">
              {campaign.start_date ?? "N/A"} – {campaign.end_date ?? "N/A"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Budget</p>
            <p className="text-sm text-foreground">
              {campaign.budget !== null ? campaign.budget : "N/A"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Goal</p>
            <p className="text-sm text-foreground">
              {campaign.goal ?? "N/A"}
            </p>
          </div>
        </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Influencers</p>
        <p className="text-sm text-foreground">
          {campaign.influencers ?? "N/A"}
        </p>
      </div>
    </div>
    <div className="pt-2">
      <Button onClick={() => navigate("/campaign/edit", { state: { campaign } })}>
        Edit Campaign
      </Button>
    </div>
  </div>
  )
}
