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
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600">キャンペーン情報がないよ。戻って選んでね。</p>
        <Button variant="outline" onClick={() => navigate("/campaign")}>
          一覧に戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <div className="section-title font-display">{campaign.name}</div>
        <div className="section-subtitle">{campaign.status ?? "下書き"}</div>
      </div>
      <Button variant="outline" onClick={() => navigate("/campaign")}>
        一覧に戻る
      </Button>
    </div>
      <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
        {campaign.description && (
          <p className="text-base text-foreground">{campaign.description}</p>
        )}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">期間</p>
            <p className="text-sm text-foreground">
              {campaign.start_date ?? "未設定"} – {campaign.end_date ?? "未設定"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">予算</p>
            <p className="text-sm text-foreground">
              {campaign.budget !== null ? campaign.budget : "未設定"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">目標</p>
            <p className="text-sm text-foreground">
              {campaign.goal ?? "未設定"}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">インフルエンサー</p>
          <p className="text-sm text-foreground">
            {campaign.influencers ?? "未設定"}
          </p>
        </div>
      </div>
      <div className="pt-2">
        <Button onClick={() => navigate("/campaign/edit", { state: { campaign } })}>
          編集する
        </Button>
      </div>
    </div>
  )
}
