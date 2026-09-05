# Supabase Platform Setup

## What is implemented

- [migrations/20260905120000_anchor_schema.sql](migrations/20260905120000_anchor_schema.sql) creates the closed-community data model, RLS policies, append-only events, blocks/reports, and transactional match commands.
- [migrations/20260905123000_platform_hardening.sql](migrations/20260905123000_platform_hardening.sql) applies least-privilege Data API grants, authenticated Cal Poly demo onboarding, server-side request/offer creation, idempotent check-in, single-request confirmation locking, and private participant-only Realtime topics.
- `confirm-match` accepts a rider’s confirmation through the authenticated database command, reserves a seat atomically, and encrypts an approved public landmark before writing the pickup reveal.
- `get-pickup-reveal` verifies the requesting user is a confirmed participant before server-side decryption. The browser never receives the encryption key.

## Required function secrets

```text
SUPABASE_SERVICE_ROLE_KEY=<server-only Supabase service role key>
PICKUP_REVEAL_ENCRYPTION_KEY=<base64url encoding of exactly 32 random bytes>
APP_ORIGIN=http://localhost:5173
```

Generate the encryption key locally; do not commit it:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Deployment sequence

1. Create an approved Supabase project. Enable email confirmation and configure the site/redirect URLs to the exact local or deployed app origin.
2. Apply both migrations in filename order to an empty development database.
3. Set the function secrets above through the Supabase dashboard or CLI.
4. Deploy `confirm-match` and `get-pickup-reveal`.
5. In Realtime Settings, disable **Allow public access to channels**. The hardening migration supplies a read-only `realtime.messages` policy for a match's rider and driver only; do not add a broad broadcast policy.
6. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally; use only a public anon key in browser configuration.
7. Each confirmed `@calpoly.edu` demo user calls `bootstrap_pilot_student(displayName)` once. It joins the fixed, active Anchor pilot community and is intentionally demo-only verification.
8. Seed only fictional demo users, zones, and public landmarks. The app works from `src/lib/demo-fixtures.ts` until these steps are complete.

Example CLI deployment (run only after logging in to the intended development project):

```text
supabase db push
supabase secrets set APP_ORIGIN=https://your-app.example
supabase secrets set PICKUP_REVEAL_ENCRYPTION_KEY=<base64url-32-byte-key>
supabase functions deploy confirm-match
supabase functions deploy get-pickup-reveal
```

`SUPABASE_SERVICE_ROLE_KEY` is required only as an Edge Function secret for `get-pickup-reveal`; never place it in `.env.local`, browser code, logs, or Git.

## Mandatory validation after deployment

- Test two simultaneous final-seat accepts; only one must succeed.
- Confirm pickup detail is unavailable before confirmation, after cancellation, and after expiry.
- Confirm a user in another community cannot list or mutate any ride resource.
- Confirm driver cancellation creates a rescue-eligible request and rider cancellation does not.
- Confirm a rider cannot accept a second offered match after one match is confirmed.
- Confirm a private Realtime topic accepts the rider and driver but rejects a third authenticated student; verify no broadcast contains pickup ciphertext or a public landmark.
- Inspect function logs: they must never include an authorization token, plaintext pickup detail, or real address.
