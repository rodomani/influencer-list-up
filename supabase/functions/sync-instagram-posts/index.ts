import { createClient } from "@supabase/supabase-js"

type FbAccountsResp = {
  data?: Array<{ instagram_business_account?: { id?: string } }>
}

type IgMediaItem = {
  id: string
  caption?: string
  media_type?: string
  permalink?: string
  timestamp?: string
  like_count?: number
  comments_count?: number
}

type InsightsResponse = {
  data?: Array<{ name?: string; values?: Array<{ value?: number }> }>
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) ?? "").trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function normalizeToken(raw: string): string {
  const stripped = raw.replace(/^Bearer\s+/i, "").trim()
  const unquoted = stripped.replace(/^['"]|['"]$/g, "").trim()

  if (!unquoted) throw new Error("IG_ACCESS_TOKEN is empty.")
  if (/\s/.test(unquoted)) throw new Error("IG_ACCESS_TOKEN contains whitespace. Store the raw token value without quotes or prefixes.")
  if (unquoted.length < 30) throw new Error("IG_ACCESS_TOKEN looks too short. Use a real Meta user access token (EAA...).")
  return unquoted
}

function mediaTypeToInt(t?: string): number {
  switch ((t ?? "").toUpperCase()) {
    case "IMAGE": return 1
    case "VIDEO": return 2
    case "CAROUSEL_ALBUM": return 3
    case "REELS": return 4
    default: return 0
  }
}

function extractHashtags(caption?: string): string[] {
  if (!caption) return []
  const tags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? []
  return [...new Set(tags.map((t) => t.slice(1).toLowerCase()))]
}

async function graphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const version = Deno.env.get("FB_GRAPH_VERSION") ?? "v24.0"
  const url = new URL(`https://graph.facebook.com/${version}${path}`)
  url.searchParams.set("access_token", token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString())
  const json = await res.json()
  if (!res.ok) throw new Error(`GRAPH ${res.status}: ${JSON.stringify(json)}`)
  return json as T
}

async function getIgBusinessUserId(fbUserToken: string): Promise<string> {
  const pages = await graphGet<FbAccountsResp>("/me/accounts", fbUserToken, {
    fields: "instagram_business_account",
    limit: "50",
  })
  const igId =
    (pages.data ?? []).find((p) => p.instagram_business_account?.id)
      ?.instagram_business_account?.id ?? null
  if (!igId) throw new Error("No instagram_business_account found.")
  return igId
}

function pickViewsLike(insights: InsightsResponse): number | null {
  const data = insights.data ?? []
  const m = new Map<string, number>()
  for (const item of data) {
    const name = item?.name
    const v = item?.values?.[0]?.value
    if (typeof name === "string" && typeof v === "number") m.set(name, v)
  }
  return m.get("plays") ?? m.get("video_views") ?? m.get("impressions") ?? m.get("reach") ?? null
}

async function mediaInsights(mediaId: string, token: string): Promise<number | null> {
  try {
    const resp = await graphGet<InsightsResponse>(`/${mediaId}/insights`, token, {
      metric: "plays,video_views,impressions,reach",
    })
    return pickViewsLike(resp)
  } catch {
    return null
  }
}

export default Deno.serve(async () => {
  try {
    const SUPABASE_URL = requireEnv("SUPABASE_URL")
    const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    const FB_USER_ACCESS_TOKEN = normalizeToken(requireEnv("IG_ACCESS_TOKEN"))
    const IG_PLATFORM = Deno.env.get("IG_PLATFORM") ?? "instagram"

    const LIMIT_MEDIA = Number(Deno.env.get("LIMIT_MEDIA") ?? "25")
    const TOP_N = Number(Deno.env.get("TOP_N") ?? "5")

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const nowIso = new Date().toISOString()
    const today = nowIso.slice(0, 10)

    const igUserId = await getIgBusinessUserId(FB_USER_ACCESS_TOKEN)

    // Get our sns_accounts row (created by sync-instagram-account)
    const { data: acc, error: accErr } = await supabase
      .from("sns_accounts")
      .select("id,profile_id")
      .eq("platform", IG_PLATFORM)
      .eq("profile_id", igUserId)
      .maybeSingle()

    if (accErr) throw new Error(accErr.message)
    if (!acc) throw new Error("sns_accounts row not found. Run sync-instagram-account first.")
    const accountId = acc.id as number

    // recent media
    const mediaResp = await graphGet<{ data?: IgMediaItem[] }>(`/${igUserId}/media`, FB_USER_ACCESS_TOKEN, {
      fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
      limit: String(LIMIT_MEDIA),
    })
    const media = mediaResp.data ?? []

    // compute viewsLike, pick TOP_N by viewsLike
    const enriched = []
    for (const item of media) {
      const viewsLike = await mediaInsights(item.id, FB_USER_ACCESS_TOKEN)
      enriched.push({ ...item, viewsLike })
    }
    enriched.sort((a, b) => (b.viewsLike ?? -1) - (a.viewsLike ?? -1))
    const top = enriched.slice(0, TOP_N)

    let maxLikes = 0
    let videosCount = 0

    for (const item of top) {
      const likes = item.like_count ?? 0
      const comments = item.comments_count ?? 0
      maxLikes = Math.max(maxLikes, likes)

      const mediaTypeInt = mediaTypeToInt(item.media_type)
      if (mediaTypeInt === 2 || mediaTypeInt === 4) videosCount += 1

      const postedAt = item.timestamp ? new Date(item.timestamp).toISOString() : null

      const { data: postRow, error: postErr } = await supabase
        .from("posts")
        .upsert(
          {
            account_id: accountId,
            external_post_id: item.id,
            media_type: mediaTypeInt,
            content_text: item.caption ?? null,
            link: item.permalink ?? null,
            posted_at: postedAt,
            scraped_at: nowIso,
            caption: item.caption ?? null,
            campaign_id: null,
            collaboration_id: null,
          },
          { onConflict: "account_id,external_post_id" }
        )
        .select("id")
        .single()

      if (postErr) throw new Error(`posts upsert failed (${item.id}): ${postErr.message}`)
      const postId = postRow.id as number

      const { error: pmErr } = await supabase.from("post_metrics").insert({
        post_id: postId,
        likes,
        comments,
        views: item.viewsLike ?? null,

        // not provided by IG for your schema -> keep null
        reposts: null,
        bookmarks: null,
        "re-tweets": null,
        citations: null,
        video_length: null,
        saves: null,
        shares: null,

        created_at: nowIso,
      } as any)

      if (pmErr) throw new Error(`post_metrics insert failed: ${pmErr.message}`)

      // hashtags
      for (const tag of extractHashtags(item.caption)) {
        const { data: h, error: hErr } = await supabase
          .from("hashtags")
          .upsert({ tag, language: null }, { onConflict: "tag" })
          .select("id")
          .single()
        if (hErr) throw new Error(`hashtags upsert failed: ${hErr.message}`)

        const { error: phErr } = await supabase
          .from("post_hashtag")
          .upsert({ post_id: postId, hashtag_id: h.id }, { onConflict: "post_id,hashtag_id" })
        if (phErr) throw new Error(`post_hashtag upsert failed: ${phErr.message}`)
      }
    }

    // update today's snapshot fields
    await supabase
      .from("accounts_metrics")
      .update({ maximum_likes: maxLikes, videos: videosCount })
      .eq("account_id", accountId)
      .eq("metric_date", today)

    return new Response(JSON.stringify({ ok: true, accountId, topPostsSynced: top.length }), {
      headers: { "content-type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }
})
