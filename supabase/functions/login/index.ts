import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, rejectUnexpectedOrigin } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  const rejectedOrigin = rejectUnexpectedOrigin(request);
  if (rejectedOrigin) return rejectedOrigin;
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const body = await request.json() as { email?: string };
    if (!body?.email) return json(request, { error: "Email is required." }, 400);
    const email = body.email.trim().toLowerCase();
    if (!email.endsWith("@calpoly.edu")) return json(request, { error: "Use a Cal Poly email." }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = crypto.randomUUID();
    const { error } = await service.from("frontend_users").upsert({ email, token }, { onConflict: ["email"] });
    if (error) {
      console.error("login function db error", error);
      return json(request, { error: "Could not create login token." }, 500);
    }
    return json(request, { token });
  } catch (err) {
    console.error("login function failed", err);
    return json(request, { error: "Login failed." }, 500);
  }
});
