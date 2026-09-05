import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptPickupDetail } from "../_shared/crypto.ts";
import { allowedLandmarks, corsHeaders, errorMessage, json, rejectUnexpectedOrigin } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  const rejectedOrigin = rejectUnexpectedOrigin(request);
  if (rejectedOrigin) return rejectedOrigin;
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json(request, { error: "Sign in to continue." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user.user) return json(request, { error: "Sign in to continue." }, 401);

    const body = await request.json() as { matchId?: string; publicLandmark?: string };
    if (!body.matchId || !allowedLandmarks.includes(body.publicLandmark as typeof allowedLandmarks[number])) {
      return json(request, { error: "Choose an approved public pickup landmark." }, 400);
    }
    const { data, error } = await supabase.rpc("accept_match", {
      target_match_id: body.matchId,
      encrypted_pickup_detail: await encryptPickupDetail(body.publicLandmark)
    });
    if (error) return json(request, { error: errorMessage(error) }, 409);
    return json(request, { match: data });
  } catch (error) {
    console.error("confirm-match failed", error);
    return json(request, { error: "The ride could not be confirmed. Please try again." }, 500);
  }
});
