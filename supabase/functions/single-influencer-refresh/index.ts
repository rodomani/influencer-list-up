import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type RefreshRequest = {
  account_id?: number
  include_posts?: boolean
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) ?? "").trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
  })
}

async function readRequest(req: Request): Promise<RefreshRequest> {
  try {
    return (await req.json()) as RefreshRequest
  } catch {
    throw new Error('Invalid JSON body. Expected: { "account_id": 123, "include_posts": true }')
  }
}

export default Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Use POST" }, 405)
    }

    const SUPABASE_URL = requireEnv("SUPABASE_URL")
    const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    const WORKER_URL = (Deno.env.get("SINGLE_INFLUENCER_REFRESH_WORKER_URL") ?? "").trim()
    const WORKER_TOKEN = (Deno.env.get("SINGLE_INFLUENCER_REFRESH_WORKER_TOKEN") ?? "").trim()

    const body = await readRequest(req)
    const accountId = Number(body.account_id)
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new Error('Missing or invalid "account_id"')
    }
    const includePosts = body.include_posts !== false

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: account, error: accountError } = await supabase
      .from("sns_accounts")
      .select("id, platform, account_name")
      .eq("id", accountId)
      .single()

    if (accountError) throw new Error(`sns_accounts fetch failed: ${accountError.message}`)
    if (!account) throw new Error(`sns_accounts row not found for id=${accountId}`)

    const startedAt = new Date().toISOString()

    const { data: activeJob, error: activeJobError } = await supabase
      .from("analysis_job_runs")
      .select("id, status, started_at, created_at")
      .eq("analysis_name", "single_influencer_refresh")
      .eq("account_id", accountId)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeJobError) throw new Error(`analysis_job_runs duplicate check failed: ${activeJobError.message}`)

    if (activeJob) {
      return jsonResponse({
        ok: true,
        status: "already_queued",
        account_id: accountId,
        job: activeJob,
        message: "このアカウントはすでに更新待ち、または更新中です。",
      })
    }

    if (WORKER_URL) {
      const workerHeaders: Record<string, string> = {
        "content-type": "application/json",
      }
      if (WORKER_TOKEN) workerHeaders.authorization = `Bearer ${WORKER_TOKEN}`

      const workerResponse = await fetch(WORKER_URL, {
        method: "POST",
        headers: workerHeaders,
        body: JSON.stringify({
          account_id: accountId,
          include_posts: includePosts,
        }),
      })

      const workerText = await workerResponse.text()
      let workerJson: unknown = null
      try {
        workerJson = workerText ? JSON.parse(workerText) : null
      } catch {
        workerJson = { raw: workerText }
      }

      if (!workerResponse.ok) {
        await supabase.from("analysis_job_runs").insert({
          analysis_name: "single_influencer_refresh",
          account_id: accountId,
          platform: account.platform,
          status: "failed",
          error_message: workerText.slice(0, 1000),
          details: { include_posts: includePosts, source: "edge-function-worker", retry_count: 0 },
          analysis_version: "v1",
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        })
        throw new Error(`Refresh worker failed: ${workerResponse.status} ${workerText.slice(0, 500)}`)
      }

      return jsonResponse({
        ok: true,
        status: "completed",
        account_id: accountId,
        worker: workerJson,
        message: "最新データを取得しました。",
      })
    }

    await supabase.from("analysis_job_runs").insert({
      analysis_name: "single_influencer_refresh",
      account_id: accountId,
      platform: account.platform,
      status: "queued",
      details: {
        include_posts: includePosts,
        retry_count: 0,
        account_name: account.account_name,
        source: "edge-function-queue",
        note: "Run apify-scrapers/single_influencer_refresh.py for this account_id from a backend worker.",
      },
      analysis_version: "v1",
      started_at: startedAt,
      finished_at: startedAt,
    })

    return jsonResponse({
      ok: true,
      status: "queued",
      account_id: accountId,
      message: "更新リクエストを受け付けました。バックグラウンドワーカーの設定後に自動実行されます。",
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      400
    )
  }
})
