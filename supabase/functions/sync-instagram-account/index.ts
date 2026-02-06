import { createClient } from "@supabase/supabase-js"

type IgMe = {
  user_id?: string
  id?: string

  username?: string
  name?: string
  account_type?: string
  profile_picture_url?: string
  followers_count?: number
  follows_count?: number
  media_count?: number

  biography?: string
  website?: string
  is_verified?: boolean
}

type InsightsResponse = {
  data?: Array<{ name?: string; values?: Array<{ value?: number }> }>
}

function pickMetric(resp: InsightsResponse, name: string): number | null {
  const item = (resp.data ?? []).find((d) => d.name === name)
  const v = item?.values?.[0]?.value
  return typeof v === "number" ? v : null
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) ?? "").trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function normalizeToken(raw: string): string {
  let t = (raw ?? "").trim()
  if (!t) throw new Error("IG_ACCESS_TOKEN is empty")

  // If user pasted a URL containing access_token=...
  try {
    const u = new URL(t)
    const fromUrl = u.searchParams.get("access_token")
    if (fromUrl) t = fromUrl
  } catch {
    // ignore
  }

  // If user pasted a querystring like access_token=...
  try {
    const qs = new URLSearchParams(t)
    const fromQs = qs.get("access_token")
    if (fromQs) t = fromQs
  } catch {
    // ignore
  }

  // If user pasted JSON like {"access_token":"..."}
  if (t.startsWith("{")) {
    try {
      const obj = JSON.parse(t)
      if (obj?.access_token) t = String(obj.access_token)
    } catch {
      // ignore
    }
  }

  t = t.replace(/^Bearer\s+/i, "").trim()
  t = t.replace(/^access_token=/i, "").trim()
  t = t.replace(/^['"]|['"]$/g, "").trim()

  // Remove invisible / control chars
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, "")
  t = t.replace(/[\x00-\x1F\x7F]/g, "")

  if (!t) throw new Error("IG_ACCESS_TOKEN became empty after normalization")
  if (/\s/.test(t)) throw new Error("IG_ACCESS_TOKEN contains whitespace")
  if (t.length < 30) throw new Error("IG_ACCESS_TOKEN looks too short")

  return t
}

async function graphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const version = Deno.env.get("IG_GRAPH_VERSION") ?? "v24.0"
  const url = new URL(`https://graph.instagram.com/${version}${path}`)

  url.searchParams.set("access_token", token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString())
  const json = await res.json()

  if (!res.ok) {
    const errMsg = (json as any)?.error?.message ?? JSON.stringify(json)
    const errCode = (json as any)?.error?.code
    const traceId = (json as any)?.error?.fbtrace_id
    const extras = [
      errCode ? `code ${errCode}` : null,
      traceId ? `fbtrace_id ${traceId}` : null,
    ].filter(Boolean)
    throw new Error(
      `GRAPH ${res.status}: ${errMsg}${extras.length ? ` (${extras.join(", ")})` : ""}`
    )
  }

  return json as T
}

async function getIgMe(token: string): Promise<IgMe & { igUserId: string }> {
  const me = await graphGet<IgMe>("/me", token, {
    fields:
      "user_id,id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
  })

  const igUserId = (me.user_id ?? me.id ?? "").trim()
  if (!igUserId) {
    throw new Error("Could not determine IG user id from /me response (missing user_id/id).")
  }

  return { ...me, igUserId }
}

type SyncRequestBody = {
  // ✅ This is your app user/profile UUID (sns_accounts.profile_id FK)
  profile_id: string
}

export default Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Use POST" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      })
    }

    // ✅ Read profile_id (uuid) from request body
    let body: SyncRequestBody
    try {
      body = (await req.json()) as SyncRequestBody
    } catch {
      throw new Error('Invalid JSON body. Expected: { "profile_id": "<uuid>" }')
    }
    const profileId = (body?.profile_id ?? "").trim()
    if (!profileId) throw new Error('Missing "profile_id" (uuid) in request body')

    const SUPABASE_URL = requireEnv("SUPABASE_URL")
    const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY")

    // ✅ Instagram Login token for graph.instagram.com
    const IG_ACCESS_TOKEN = normalizeToken(requireEnv("IG_ACCESS_TOKEN"))

    console.log("IG token fingerprint", {
      len: IG_ACCESS_TOKEN.length,
      head: IG_ACCESS_TOKEN.slice(0, 12),
      tail: IG_ACCESS_TOKEN.slice(-12),
    })
    console.log("Sync request", { profileId })

    const IG_PLATFORM = Deno.env.get("IG_PLATFORM") ?? "instagram"

    const PLACEHOLDER_PROFILE_IMAGE =
      Deno.env.get("PLACEHOLDER_PROFILE_IMAGE") ??
      "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const nowIso = new Date().toISOString()
    const today = nowIso.slice(0, 10)

    const me = await getIgMe(IG_ACCESS_TOKEN)
    const igPlatformProfileId = me.igUserId // ✅ external IG id (numeric string)

    const username = me.username ?? ""
    const accountUrl = username ? `https://www.instagram.com/${username}/` : null
    const profileImageUrl = me.profile_picture_url ?? PLACEHOLDER_PROFILE_IMAGE

    // ✅ Now we query by your app profile UUID (profile_id) + platform
    const existing = await supabase
      .from("sns_accounts")
      .select("country,email,language,gender,does_livestream,keywords")
      .eq("platform", IG_PLATFORM)
      .eq("profile_id", profileId)
      .maybeSingle()

    if (existing.error) throw new Error(`sns_accounts fetch failed: ${existing.error.message}`)

    // ✅ Upsert keeps profile_id as UUID, stores IG ID in platform_profile_id (text)
    const { data: accountRow, error: accErr } = await supabase
      .from("sns_accounts")
      .upsert(
        {
          platform: IG_PLATFORM,
          profile_id: profileId, // ✅ uuid FK to your user
          platform_profile_id: igPlatformProfileId, // ✅ IG numeric id as text

          account_name: username || me.name || igPlatformProfileId,
          account_url: accountUrl,

          caption: (me as any).biography ?? null,
          profile_image_url: profileImageUrl,
          is_verified: (me as any).is_verified ?? false,
          business_account: true,

          country: existing.data?.country ?? null,
          email: existing.data?.email ?? null,
          language: existing.data?.language ?? null,
          gender: existing.data?.gender ?? null,
          does_livestream: existing.data?.does_livestream ?? null,
          keywords: existing.data?.keywords ?? null,

          updated_at: nowIso,
        },
        // ✅ IMPORTANT: This must match your UNIQUE index/constraint in DB.
        // If you created unique(profile_id, platform), keep this:
        { onConflict: "profile_id,platform" }
        // If instead you created unique(platform, platform_profile_id), use:
        // { onConflict: "platform,platform_profile_id" }
      )
      .select("id")
      .single()

    if (accErr) throw new Error(`sns_accounts upsert failed: ${accErr.message}`)
    if (!accountRow?.id) throw new Error("sns_accounts upsert returned no id")
    const accountId = accountRow.id as number

    // profile_views (may require insights permissions; if it fails, store null)
    let profileViews: number | null = null
    try {
      const insights = await graphGet<InsightsResponse>(
        `/${igPlatformProfileId}/insights`,
        IG_ACCESS_TOKEN,
        { metric: "profile_views", period: "day" }
      )
      profileViews = pickMetric(insights, "profile_views")
    } catch {
      profileViews = null
    }

    const { error: amErr } = await supabase.from("accounts_metrics").insert({
      account_id: accountId,
      posts: me.media_count ?? null,
      followers: me.followers_count ?? null,
      following: me.follows_count ?? null,
      profile_views: profileViews,
      videos: null,
      metric_date: today,
      created_at: nowIso,
      maximum_likes: null,
    } as any)

    if (amErr) throw new Error(`accounts_metrics insert failed: ${amErr.message}`)

    return new Response(
      JSON.stringify({
        ok: true,
        accountId,
        profile_id: profileId,
        platform: IG_PLATFORM,
        platform_profile_id: igPlatformProfileId,
      }),
      { headers: { "content-type": "application/json" } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }
})
