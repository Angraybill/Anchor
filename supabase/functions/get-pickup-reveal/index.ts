import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptPickupDetail } from "../_shared/crypto.ts";
import { corsHeaders, HttpInputError, isUuid, json, readJsonBody, rejectUnexpectedOrigin } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const rejectedOrigin = rejectUnexpectedOrigin(request);
  if (rejectedOrigin) return rejectedOrigin;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) return json(request, { error: "Sign in to continue." }, 401);
    const body = await readJsonBody<{ matchId?: string }>(request);
    if (!isUuid(body.matchId)) return json(request, { error: "A valid match is required." }, 400);

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
    if (error instanceof HttpInputError) return json(request, { error: error.message }, 400);
    console.error("get-pickup-reveal failed", error);
    return json(request, { error: "Pickup details are unavailable right now." }, 500);
  }
});
