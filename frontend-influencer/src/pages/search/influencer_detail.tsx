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
        setError("Missing influencer id.")
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
    <div className="min-h-screen w-full px-4">
      <div className="flex w-full flex-col items-end gap-4 lg:w-auto lg:min-w-[200px]">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
      {loading && <p className="text-sm text-muted-foreground">Loading influencer...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && !influencer && (
        <p className="text-sm text-muted-foreground">Influencer not found.</p>
      )}

      {!loading && !error && influencer && (
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
          
          <div className="w-full space-y-8 lg:max-w-5xl">
            <div>
              <CardTitle className="pb-2">{influencer.account_name}</CardTitle>
              <div className="text-sm text-muted-foreground">{influencer.platform}</div>
            </div>

            <section>
              <div className="font-medium text-foreground">Details</div>
              <div className="text-sm text-muted-foreground">
                <div>Gender: {influencer.gender ?? "N/A"}</div>
                <div>Keywords: {keywordList.length ? keywordList.join(", ") : "N/A"}</div>
                <div>
                  Profile URL:{" "}
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
                    "N/A"
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="font-medium text-foreground">Metrics</div>
              <div className="text-sm text-muted-foreground">
                <div>Posts: {latestMetrics?.posts ?? "N/A"}</div>
                <div>Followers: {latestMetrics?.followers ?? "N/A"}</div>
                <div>Max Likes: {latestMetrics?.maximum_likes ?? "N/A"}</div>
              </div>
            </section>

            {influencer.caption && (
              <section>
                <div className="font-medium text-foreground">Bio</div>
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
      )}
    </div>
  )
}
