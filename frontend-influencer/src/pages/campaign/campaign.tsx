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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <div className="section-title font-display">キャンペーン一覧</div>
        <div className="section-subtitle">計画・進行・振り返りをまとめて管理。</div>
      </div>
      <Button onClick={() => navigate("/campaign/create")}>
          新しいキャンペーン
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}

      {!loading && campaigns.length === 0 && (
        <p className="text-sm text-muted-foreground">キャンペーンがまだないよ。</p>
      )}

      {!loading && campaigns.length > 0 && (
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="section-title">進行中</h2>
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
                      <CardTitle className="text-lg font-display">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campaign.status ?? "下書き"}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {campaign.description && (
                        <p className="text-sm text-foreground">{campaign.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {campaign.start_date ?? "未設定"} – {campaign.end_date ?? "未設定"}
                      </p>
                      {campaign.budget !== null && (
                        <p className="text-xs text-muted-foreground">予算: {campaign.budget}</p>
                      )}
                      {campaign.goal && (
                        <p className="text-xs text-muted-foreground">目標: {campaign.goal}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="section-title">完了</h2>
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
                      <CardTitle className="text-lg font-display">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campaign.status ?? "下書き"}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {campaign.description && (
                        <p className="text-sm text-foreground">{campaign.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {campaign.start_date ?? "未設定"} – {campaign.end_date ?? "未設定"}
                      </p>
                      {campaign.budget !== null && (
                        <p className="text-xs text-muted-foreground">予算: {campaign.budget}</p>
                      )}
                      {campaign.goal && (
                        <p className="text-xs text-muted-foreground">目標: {campaign.goal}</p>
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
