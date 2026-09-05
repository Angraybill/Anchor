import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptPickupDetail } from "../_shared/crypto.ts";
import { corsHeaders, json, rejectUnexpectedOrigin } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  const rejectedOrigin = rejectUnexpectedOrigin(request);
  if (rejectedOrigin) return rejectedOrigin;
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json(request, { error: "Sign in to continue." }, 401);
    const body = await request.json() as { matchId?: string };
    if (!body.matchId) return json(request, { error: "A match is required." }, 400);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: match, error: matchError } = await userClient
      .from("matches")
      .select("id, state")
      .eq("id", body.matchId)
      .maybeSingle();
    if (matchError || !match || !["confirmed", "in_progress"].includes(match.state)) {
      return json(request, { pickupReveal: null });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: reveal, error: revealError } = await serviceClient
      .from("pickup_reveals")
      .select("encrypted_detail, visible_after, expires_at")
      .eq("match_id", match.id)
      .lte("visible_after", new Date().toISOString())
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (revealError || !reveal) return json(request, { pickupReveal: null });

    return json(request, {
      pickupReveal: {
        publicLandmark: await decryptPickupDetail(reveal.encrypted_detail),
        visibleAfter: reveal.visible_after,
        expiresAt: reveal.expires_at
      }
    });
  } catch (error) {
    console.error("get-pickup-reveal failed", error);
    return json(request, { error: "Pickup details are unavailable right now." }, 500);
  }
});
