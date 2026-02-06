import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Creates a campaign for the authenticated user with simple validation.
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const body = await req.json().catch(() => ({}))
  const { name, description, start_date, end_date, budget, goal, status } = body

  if (!name) {
    return new Response(JSON.stringify({ error: "name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const startDate = start_date ? new Date(start_date) : null
  const endDate = end_date ? new Date(end_date) : null
  if (startDate && endDate && endDate < startDate) {
    return new Response(JSON.stringify({ error: "end_date must be after start_date" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const serverClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userResult, error: userError } = await serverClient.auth.getUser()
  if (userError || !userResult.user) {
    return new Response(JSON.stringify({ error: "Invalid user" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { data, error } = await serverClient
    .from("campaigns")
    .insert({
      user_id: userResult.user.id,
      name,
      description: description ?? null,
      start_date: startDate ? startDate.toISOString().split("T")[0] : null,
      end_date: endDate ? endDate.toISOString().split("T")[0] : null,
      budget: typeof budget === "number" ? budget : budget ? Number(budget) : null,
      goal: goal ?? null,
      status: status ?? "draft",
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ campaign: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
