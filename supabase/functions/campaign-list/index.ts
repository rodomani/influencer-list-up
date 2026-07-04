import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { handleCors, jsonResponse, readBearerToken } from "../_shared/http.ts"

const ALLOWED_CAMPAIGN_STATUSES = new Set([
  "draft",
  "ongoing",
  "complete",
  "paused",
  "needs_review",
])

// Lists campaigns for the authenticated user with optional status filter.
serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing Supabase env vars" }, 500)
  }

  let token = ""
  try {
    token = readBearerToken(req)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Missing bearer token" }, 401)
  }

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get("status")?.trim() ?? null
  if (statusFilter && !ALLOWED_CAMPAIGN_STATUSES.has(statusFilter)) {
    return jsonResponse({ error: "Invalid campaign status filter" }, 400)
  }

  const serverClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userResult, error: userError } = await serverClient.auth.getUser()
  if (userError || !userResult.user) {
    return jsonResponse({ error: "Invalid user" }, 401)
  }

  let query = serverClient
    .from("campaigns")
    .select("id,user_id,name,description,start_date,end_date,budget,goal,status,created_at,updated_at,influencers,internal_memo")
    .eq("user_id", userResult.user.id)
    .order("created_at", { ascending: false })
  if (statusFilter) {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse({ campaigns: data }, 200)
})
