import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { handleCors, jsonResponse, readBearerToken } from "../_shared/http.ts"

const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_GOAL_LENGTH = 500
const ALLOWED_CAMPAIGN_STATUSES = new Set([
  "draft",
  "ongoing",
  "complete",
  "paused",
  "needs_review",
])

// Creates a campaign for the authenticated user with simple validation.
serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== "POST") {
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

  const body = await req.json().catch(() => ({}))
  const { name, description, start_date, end_date, budget, goal, status } = body

  const normalizedName = typeof name === "string" ? name.trim() : ""
  if (!normalizedName) {
    return jsonResponse({ error: "name is required" }, 400)
  }
  if (normalizedName.length > MAX_NAME_LENGTH) {
    return jsonResponse({ error: `name must be at most ${MAX_NAME_LENGTH} characters` }, 400)
  }

  const normalizedDescription =
    typeof description === "string" ? description.trim() : ""
  if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
    return jsonResponse({ error: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters` }, 400)
  }

  const normalizedGoal = typeof goal === "string" ? goal.trim() : ""
  if (normalizedGoal.length > MAX_GOAL_LENGTH) {
    return jsonResponse({ error: `goal must be at most ${MAX_GOAL_LENGTH} characters` }, 400)
  }

  const startDate = start_date ? new Date(start_date) : null
  const endDate = end_date ? new Date(end_date) : null
  if (startDate && endDate && endDate < startDate) {
    return jsonResponse({ error: "end_date must be after start_date" }, 400)
  }

  const parsedBudget =
    budget === null || budget === undefined || budget === ""
      ? null
      : Number(budget)
  if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
    return jsonResponse({ error: "budget must be a nonnegative number" }, 400)
  }

  const normalizedStatus =
    typeof status === "string" && status.trim() ? status.trim() : "draft"
  if (!ALLOWED_CAMPAIGN_STATUSES.has(normalizedStatus)) {
    return jsonResponse({ error: "Invalid campaign status" }, 400)
  }

  const serverClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userResult, error: userError } = await serverClient.auth.getUser()
  if (userError || !userResult.user) {
    return jsonResponse({ error: "Invalid user" }, 401)
  }

  const { data, error } = await serverClient
    .from("campaigns")
    .insert({
      user_id: userResult.user.id,
      name: normalizedName,
      description: normalizedDescription || null,
      start_date: startDate ? startDate.toISOString().split("T")[0] : null,
      end_date: endDate ? endDate.toISOString().split("T")[0] : null,
      budget: parsedBudget,
      goal: normalizedGoal || null,
      status: normalizedStatus,
    })
    .select()
    .single()

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse({ campaign: data }, 200)
})
