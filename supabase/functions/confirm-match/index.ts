import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptPickupDetail } from "../_shared/crypto.ts";
import { allowedLandmarks, allowedLandmarksByPickupZone, corsHeaders, HttpInputError, isUuid, json, readJsonBody, rejectUnexpectedOrigin } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const rejectedOrigin = rejectUnexpectedOrigin(request);
  if (rejectedOrigin) return rejectedOrigin;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) return json(request, { error: "Sign in to continue." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user.user) return json(request, { error: "Sign in to continue." }, 401);

    const body = await readJsonBody<{ matchId?: string; publicLandmark?: string }>(request);
    if (!isUuid(body.matchId) || !allowedLandmarks.includes(body.publicLandmark as typeof allowedLandmarks[number])) {
      return json(request, { error: "Choose an approved public pickup landmark." }, 400);
    }

    // The user-scoped client enforces RLS: only a match participant can read this match,
    // and only the rider's request can be read here. The RPC still enforces that rider
    // ownership before it changes state.
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, request_id, state")
      .eq("id", body.matchId)
      .maybeSingle();
    if (matchError || !match || match.state !== "driver_offered") {
      return json(request, { error: "That ride can no longer be confirmed. Please refresh and try again." }, 409);
    }
    const { data: anchorRequest, error: requestError } = await supabase
      .from("anchor_requests")
      .select("pickup_zone")
      .eq("id", match.request_id)
      .maybeSingle();
    const approvedForZone = anchorRequest && allowedLandmarksByPickupZone[anchorRequest.pickup_zone]?.includes(body.publicLandmark);
    if (requestError || !approvedForZone) {
      return json(request, { error: "Choose an approved public pickup landmark for this pickup zone." }, 400);
    }

    const { data, error } = await supabase.rpc("accept_match", {
      target_match_id: body.matchId,
      encrypted_pickup_detail: await encryptPickupDetail(body.publicLandmark)
    });
    if (error) return json(request, { error: "That ride can no longer be confirmed. Please refresh and try again." }, 409);
    return json(request, { match: data });
  } catch (error) {
    if (error instanceof HttpInputError) return json(request, { error: error.message }, 400);
    console.error("confirm-match failed", error);
    return json(request, { error: "The ride could not be confirmed. Please try again." }, 500);
  }
});
