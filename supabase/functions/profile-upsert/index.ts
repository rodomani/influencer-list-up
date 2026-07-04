import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { handleCors, jsonResponse, readBearerToken } from "../_shared/http.ts"

const TIMEZONE_OPTIONS = new Set([
  "Asia/Seoul",
  "Asia/Tokyo",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
])

const LANGUAGE_OPTIONS = new Set(["ja", "ko", "en"])

const MAX_NAME_LENGTH = 80
const MAX_COMPANY_LENGTH = 120
const MAX_ROLE_LENGTH = 80

const normalizeOptionalString = (value: unknown, maxLength: number) => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string") throw new Error("Invalid payload field type")

  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > maxLength) throw new Error(`Field exceeds max length ${maxLength}`)
  return normalized
}

const normalizeRequiredOption = (value: unknown, allowed: Set<string>, field: string) => {
  if (typeof value !== "string") throw new Error(`${field} is required`)
  const normalized = value.trim()
  if (!allowed.has(normalized)) throw new Error(`Invalid ${field}`)
  return normalized
}

// Upserts the authenticated user's profile into the public.users table.
// Expects Authorization: Bearer <access_token> and a JSON body with optional
// { name, company, role, timezone, language }.
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

  const serverClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userResult, error: userError } = await serverClient.auth.getUser()
  if (userError || !userResult.user) {
    return jsonResponse({ error: "Invalid user" }, 401)
  }

  const payload = await req.json().catch(() => ({}))
  let name: string | null
  let company: string | null
  let role: string | null
  let timezone: string
  let language: string

  try {
    name = normalizeOptionalString(payload.name, MAX_NAME_LENGTH)
    company = normalizeOptionalString(payload.company, MAX_COMPANY_LENGTH)
    role = normalizeOptionalString(payload.role, MAX_ROLE_LENGTH)
    timezone = normalizeRequiredOption(payload.timezone, TIMEZONE_OPTIONS, "timezone")
    language = normalizeRequiredOption(payload.language, LANGUAGE_OPTIONS, "language")
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid payload" }, 400)
  }

  const { error } = await serverClient.from("users").upsert({
    id: userResult.user.id,
    email: userResult.user.email,
    name,
    company,
    role,
    timezone,
    language,
    email_verified: userResult.user.email_confirmed_at ? true : false,
  })

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse({ ok: true }, 200)
})
