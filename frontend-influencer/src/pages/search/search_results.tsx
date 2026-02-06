import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type Filters = {
  platforms: string[]
  username?: string
  gender?: string
  keywords?: string[]
  likes?: number[]
  posts?: number[]
  followers?: number[]
  campaignId?: string
}

type MetricsRow = {
  maximum_likes: number | null
  posts: number | null
  followers: number | null
  metric_date?: string | null
}

type InfluencerRowFromDB = {
  id: number
  platform: string
  account_name: string
  gender: string | null
  keywords: string | null // DB is text
  profile_image_url: string | null
  accounts_metrics?: MetricsRow[] | null // embedded returns array
}

type InfluencerNormalized = {
  id: number
  platform: string
  account_name: string
  profile_image_url?: string | null
  gender: string | null
  keywords: string | null
  accounts_metrics: MetricsRow | null // single latest metric row
}

export function SearchResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const filters: Filters | undefined = location.state?.filters
  const ITEMS_PER_PAGE = 10

  const [influencers, setInfluencers] = useState<InfluencerNormalized[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const [campaigns, setCampaigns] = useState<
    { id: string; name: string; influencers: string | null }[]
  >([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [savingCampaignId, setSavingCampaignId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInfluencerName, setSelectedInfluencerName] = useState<string>("")

  const totalPages = Math.max(1, Math.ceil(influencers.length / ITEMS_PER_PAGE))
  const paginatedInfluencers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return influencers.slice(start, start + ITEMS_PER_PAGE)
  }, [currentPage, influencers])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user) return
      setCampaignsLoading(true)
      setCampaignsError(null)

      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, influencers")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) setCampaignsError(error.message)
      else setCampaigns(data ?? [])

      setCampaignsLoading(false)
    }

    fetchCampaigns()
  }, [user])

  useEffect(() => {
    const fetchInfluencers = async () => {
      if (!filters) {
        setError("No filters provided (did you refresh this page?). Go back and search again.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      // ranges
      const [likeMin, likeMax] = filters.likes ?? [0, 10_000_000]
      const [postMin, postMax] = filters.posts ?? [0, 10_000_000]
      const [followerMin, followerMax] = filters.followers ?? [0, 10_000_000]

      // Base query: get accounts + their metrics rows (we'll pick latest in JS)
      let query = supabase
        .from("sns_accounts")
        .select(
          `
          id,
          platform,
          account_name,
          gender,
          keywords,
          profile_image_url,
          accounts_metrics(maximum_likes, posts, followers, metric_date)
        `
        )
        // order embedded metrics so [0] is latest
        .order("metric_date", { foreignTable: "accounts_metrics", ascending: false })

      // Platform filter (case-insensitive safe):
      // Instead of .in(...) which fails if DB has "Instagram" vs "instagram",
      // use OR of ilike
      if (filters.platforms?.length) {
        const orPlatforms = filters.platforms
          .map((p) => `platform.ilike.%${p}%`)
          .join(",")
        query = query.or(orPlatforms)
      }

      if (filters.username?.trim()) {
        query = query.ilike("account_name", `%${filters.username.trim()}%`)
      }

      if (filters.gender?.trim()) {
        query = query.ilike("gender", `%${filters.gender.trim()}%`)
      }

      // keywords is TEXT: match any selected keyword inside the text column
      if (filters.keywords?.length) {
        const orKeywords = filters.keywords
          .map((k) => `keywords.ilike.%${k}%`)
          .join(",")
        query = query.or(orKeywords)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
        setInfluencers([])
        setLoading(false)
        return
      }

      const rows = (data as InfluencerRowFromDB[]) ?? []

      // Normalize metrics: take latest row and treat null / -1 as 0 for filtering
      const pickLatest = (m: MetricsRow[] | null | undefined): MetricsRow | null =>
        Array.isArray(m) && m.length > 0 ? m[0] : null

      const normMetric = (v: number | null | undefined) => {
        if (v == null) return 0
        if (v < 0) return 0 // IMPORTANT: your scraper uses -1 (unknown) -> treat as 0
        return v
      }

      const within = (v: number, min: number, max: number) => v >= min && v <= max

      const normalized: InfluencerNormalized[] = rows.map((r) => ({
        id: r.id,
        platform: r.platform,
        account_name: r.account_name,
        gender: r.gender,
        keywords: r.keywords,
        profile_image_url: r.profile_image_url,
        accounts_metrics: pickLatest(r.accounts_metrics),
      }))

      // Apply ranges client-side (so -1/null doesn't kill everything)
      const filtered = normalized.filter((row) => {
        const m = row.accounts_metrics
        const likes = normMetric(m?.maximum_likes)
        const posts = normMetric(m?.posts)
        const followers = normMetric(m?.followers)

        return (
          within(likes, likeMin, likeMax) &&
          within(posts, postMin, postMax) &&
          within(followers, followerMin, followerMax)
        )
      })

      setInfluencers(filtered)
      setLoading(false)
    }

    fetchInfluencers()
  }, [filters])

  const handleAddToCampaign = async (campaignId: string) => {
    if (!user || !selectedInfluencerName) return
    setSavingCampaignId(campaignId)

    const existing = campaigns.find((c) => c.id === campaignId)
    const updatedInfluencers = existing?.influencers
      ? `${existing.influencers}, ${selectedInfluencerName}`
      : selectedInfluencerName

    const { error } = await supabase
      .from("campaigns")
      .update({ influencers: updatedInfluencers })
      .eq("id", campaignId)
      .eq("user_id", user.id)

    if (error) {
      setCampaignsError(error.message)
    } else if (existing) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, influencers: updatedInfluencers } : c))
      )
      setDialogOpen(false)
    }

    setSavingCampaignId(null)
  }

  return (
    <div className="min-h-screen min-w-270 px-4">
      <div className="pb-5 flex justify-end">
        <Button variant="outline" onClick={() => navigate("/search/search")}>
          Back to Search
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Searching influencers...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && influencers.length === 0 && (
        <p className="text-sm text-muted-foreground">No influencers found.</p>
      )}

      <div className="grid gap-4">
        {paginatedInfluencers.map((influencer) => {
          const metrics = influencer.accounts_metrics

          const keywordList =
            typeof influencer.keywords === "string"
              ? influencer.keywords.split(",").map((s) => s.trim()).filter(Boolean)
              : []

          return (
            <Card
              key={influencer.id}
              className="w-full cursor-pointer transition-shadow hover:shadow-md"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/search/influencer/${influencer.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  navigate(`/search/influencer/${influencer.id}`)
                }
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="pb-2">{influencer.account_name}</CardTitle>
                  {influencer.profile_image_url ? (
                    <img
                      src={influencer.profile_image_url}
                      alt={`${influencer.account_name} profile`}
                      className="h-16 w-16 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                  <CardDescription className="flex-1">
                    <div className="font-medium text-foreground">Information</div>
                    <div className="flex flex-col text-muted-foreground">
                      <span>Platform: {influencer.platform}</span>
                      <span>Gender: {influencer.gender ?? "N/A"}</span>
                      <span>Keywords: {keywordList.length ? keywordList.join(", ") : "N/A"}</span>
                    </div>
                  </CardDescription>

                  <CardDescription className="flex-1">
                    <div className="font-medium text-foreground">Metrics</div>
                    <div className="flex flex-col text-muted-foreground">
                      <span>Posts: {metrics?.posts ?? "N/A"}</span>
                      <span>Followers: {metrics?.followers ?? "N/A"}</span>
                      <span>Max Likes: {metrics?.maximum_likes ?? "N/A"}</span>
                    </div>
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent />

              <CardFooter className="flex-col gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedInfluencerName(influencer.account_name)
                      }}
                    >
                      Add to Campaign
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select a campaign</DialogTitle>
                      <DialogDescription>
                        Choose one of your campaigns to attach{" "}
                        {selectedInfluencerName || "this influencer"}.
                      </DialogDescription>
                    </DialogHeader>

                    {campaignsLoading && (
                      <p className="text-sm text-muted-foreground">Loading campaigns...</p>
                    )}
                    {campaignsError && (
                      <p className="text-sm text-red-600">Error: {campaignsError}</p>
                    )}
                    {!campaignsLoading && campaigns.length === 0 && (
                      <p className="text-sm text-muted-foreground">No campaigns found.</p>
                    )}

                    <div className="flex flex-col gap-2">
                      {campaigns.map((campaign) => (
                        <Button
                          key={campaign.id}
                          variant="outline"
                          className="justify-start"
                          disabled={savingCampaignId === campaign.id}
                          onClick={() => handleAddToCampaign(campaign.id)}
                        >
                          {savingCampaignId === campaign.id ? "Saving..." : campaign.name}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {!loading && !error && influencers.length > ITEMS_PER_PAGE && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={(event) => {
                    event.preventDefault()
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(event) => {
                        event.preventDefault()
                        setCurrentPage(page)
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  onClick={(event) => {
                    event.preventDefault()
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
