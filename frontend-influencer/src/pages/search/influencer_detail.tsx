import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

type MetricsRow = {
  maximum_likes: number | null
  posts: number | null
  followers: number | null
  metric_date?: string | null
}

type InfluencerDetail = {
  id: number
  platform: string
  account_name: string
  account_url: string | null
  caption: string | null
  profile_image_url: string | null
  gender: string | null
  keywords: string | null
  accounts_metrics?: MetricsRow[] | null
}

export function InfluencerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [influencer, setInfluencer] = useState<InfluencerDetail | null>(null)

  const latestMetrics = useMemo(() => {
    const rows = influencer?.accounts_metrics
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
  }, [influencer])

  useEffect(() => {
    const fetchInfluencer = async () => {
      if (!id) {
        setError("IDが見つからないよ。")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("sns_accounts")
        .select(
          `
          id,
          platform,
          account_name,
          account_url,
          caption,
          profile_image_url,
          gender,
          keywords,
          accounts_metrics(maximum_likes, posts, followers, metric_date)
        `
        )
        .eq("id", id)
        .order("metric_date", { foreignTable: "accounts_metrics", ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        setError(error.message)
        setInfluencer(null)
      } else {
        setInfluencer((data as InfluencerDetail) ?? null)
      }

      setLoading(false)
    }

    fetchInfluencer()
  }, [id])

  const keywordList =
    typeof influencer?.keywords === "string"
      ? influencer.keywords.split(",").map((s) => s.trim()).filter(Boolean)
      : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <div className="section-title font-display">インフルエンサー詳細</div>
        <div className="section-subtitle">連絡前に情報をチェックしよう。</div>
      </div>
      <Button variant="outline" onClick={() => navigate(-1)}>
          戻る
        </Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラー: {error}</p>}
      {!loading && !error && !influencer && (
        <p className="text-sm text-muted-foreground">見つからなかったよ。</p>
      )}

      {!loading && !error && influencer && (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full space-y-8 lg:max-w-5xl">
              <div>
                <CardTitle className="pb-2 font-display">{influencer.account_name}</CardTitle>
                <div className="text-sm text-muted-foreground">{influencer.platform}</div>
              </div>

              <section>
                <div className="font-medium text-foreground">詳細</div>
                <div className="text-sm text-muted-foreground">
                  <div>性別: {influencer.gender ?? "未設定"}</div>
                  <div>キーワード: {keywordList.length ? keywordList.join(", ") : "なし"}</div>
                  <div>
                    プロフィールURL:{" "}
                    {influencer.account_url ? (
                      <a
                        href={influencer.account_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        {influencer.account_url}
                      </a>
                    ) : (
                      "未設定"
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div className="font-medium text-foreground">指標</div>
                <div className="text-sm text-muted-foreground">
                  <div>投稿数: {latestMetrics?.posts ?? "未設定"}</div>
                  <div>フォロワー: {latestMetrics?.followers ?? "未設定"}</div>
                  <div>最大いいね: {latestMetrics?.maximum_likes ?? "未設定"}</div>
                </div>
              </section>

              {influencer.caption && (
                <section>
                  <div className="font-medium text-foreground">自己紹介</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {influencer.caption}
                  </p>
                </section>
              )}
            </div>
            <div className="flex w-full flex-col items-end gap-4 lg:w-auto lg:min-w-[200px]">
              {influencer.profile_image_url ? (
                <img
                  src={influencer.profile_image_url}
                  alt={`${influencer.account_name} profile`}
                  className="h-20 w-20 shrink-0 rounded-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
