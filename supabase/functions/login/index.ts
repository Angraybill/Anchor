import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, rejectUnexpectedOrigin } from "../_shared/http.ts";

async function sha256hex(str: string) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CODE_TTL_MINUTES = 10;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  const rejectedOrigin = rejectUnexpectedOrigin(request);
  if (rejectedOrigin) return rejectedOrigin;
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const body = (await request.json()) as { email?: string; action?: string; code?: string };
    if (!body?.email) return json(request, { error: "Email is required." }, 400);
    const email = body.email.trim().toLowerCase();
    if (!email.endsWith("@calpoly.edu")) return json(request, { error: "Use a Cal Poly email." }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.action === "request") {
      // generate short numeric code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await sha256hex(code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

      const { error: upsertErr } = await service
        .from("frontend_user_codes")
        .upsert({ email, code_hash: codeHash, expires_at: expiresAt }, { onConflict: ["email"] });
      if (upsertErr) {
        console.error("login function upsert_code error", upsertErr);
        return json(request, { error: "Could not store verification code." }, 500);
      }

      // Try to send via SendGrid if configured, otherwise log code for dev.
      const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
      if (sendgridKey) {
        try {
          await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: { Authorization: `Bearer ${sendgridKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }], subject: "Your PolyPassenger sign-in code" }],
              from: { email: Deno.env.get("FROM_EMAIL") ?? "noreply@poly-passenger.app" },
              content: [{ type: "text/plain", value: `Your verification code is: ${code}` }],
            }),
          });
        } catch (e) {
          console.error("sendgrid send failed", e);
        }
      } else {
        console.log("Verification code for", email, ":", code);
      }

      return json(request, { ok: true });
    }

    if (body.action === "verify") {
      if (!body.code) return json(request, { error: "Code is required." }, 400);
      const codeHash = await sha256hex(body.code.trim());

      const { data: rows, error: selectErr } = await service
        .from("frontend_user_codes")
        .select("code_hash, expires_at")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (selectErr) {
        console.error("login function select_code error", selectErr);
        return json(request, { error: "Verification failed." }, 500);
      }
      if (!rows) return json(request, { error: "No pending code for this email." }, 400);
      if (rows.code_hash !== codeHash) return json(request, { error: "Invalid code." }, 400);
      if (new Date(rows.expires_at) < new Date()) return json(request, { error: "Code expired." }, 400);

      // Issue final session token
      const token = crypto.randomUUID();
      const { error: upsertTokenErr } = await service
        .from("frontend_users")
        .upsert({ email, token }, { onConflict: ["email"] });
      if (upsertTokenErr) {
        console.error("login function upsert_token error", upsertTokenErr);
        return json(request, { error: "Could not create login token." }, 500);
      }

      // cleanup code
      await service.from("frontend_user_codes").delete().eq("email", email);

      return json(request, { token });
    }

    return json(request, { error: "Invalid action." }, 400);
  } catch (err) {
    console.error("login function failed", err);
    return json(request, { error: "Login failed." }, 500);
  }
});
