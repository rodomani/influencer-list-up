import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Webhook handler for Supabase auth "user.confirmed" (email verified) events.
// Configure your Supabase Auth hook to POST here with a secret header.
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const hookSecret = Deno.env.get("AUTH_HOOK_SECRET")
  if (!hookSecret) {
    return new Response("Missing AUTH_HOOK_SECRET", { status: 500 })
  }

  const providedSecret = req.headers.get("x-auth-hook-secret")
  if (providedSecret !== hookSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase env vars", { status: 500 })
  }

  const payload = await req.json().catch(() => null)
  const userId = payload?.record?.id as string | undefined
  const email = payload?.record?.email as string | undefined

  if (!userId) {
    return new Response("Missing user id", { status: 400 })
  }

  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { error } = await client
    .from("users")
    .update({ email_verified: true, email: email ?? undefined })
    .eq("id", userId)

  if (error) {
    return new Response(error.message, { status: 400 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
