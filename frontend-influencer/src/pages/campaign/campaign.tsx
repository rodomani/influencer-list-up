import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"

type Campaign = {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  budget: number | null
  goal: string | null
  status: string | null
}

export function CampaignScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user) return
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setCampaigns(data ?? [])
      }
      setLoading(false)
    }

    fetchCampaigns()
  }, [user])

  return (
    <div className="w-full min-h-screen px-8 py-6 space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate("/campaign/create")}>
          Create New Campaign
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading campaigns...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && campaigns.length === 0 && (
        <p className="text-sm text-muted-foreground">No campaigns yet.</p>
      )}

      {!loading && campaigns.length > 0 && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Ongoing</h2>
            <div className="flex flex-wrap items-start gap-4">
              {campaigns
                .filter((campaign) => campaign.status !== "complete")
                .map((campaign) => (
                  <Card
                    key={campaign.id}
                    className="w-fit cursor-pointer transition hover:border-primary hover:shadow-sm"
                    onClick={() => navigate("/campaign/detail", { state: { campaign } })}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campaign.status ?? "draft"}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {campaign.description && (
                        <p className="text-sm text-foreground">{campaign.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {campaign.start_date ?? "N/A"} – {campaign.end_date ?? "N/A"}
                      </p>
                      {campaign.budget !== null && (
                        <p className="text-xs text-muted-foreground">Budget: {campaign.budget}</p>
                      )}
                      {campaign.goal && (
                        <p className="text-xs text-muted-foreground">Goal: {campaign.goal}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Complete</h2>
            <div className="flex flex-wrap items-start gap-4">
              {campaigns
                .filter((campaign) => campaign.status === "complete")
                .map((campaign) => (
                  <Card
                    key={campaign.id}
                    className="w-fit cursor-pointer transition hover:border-primary hover:shadow-sm"
                    onClick={() => navigate("/campaign/detail", { state: { campaign } })}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campaign.status ?? "draft"}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {campaign.description && (
                        <p className="text-sm text-foreground">{campaign.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {campaign.start_date ?? "N/A"} – {campaign.end_date ?? "N/A"}
                      </p>
                      {campaign.budget !== null && (
                        <p className="text-xs text-muted-foreground">Budget: {campaign.budget}</p>
                      )}
                      {campaign.goal && (
                        <p className="text-xs text-muted-foreground">Goal: {campaign.goal}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
