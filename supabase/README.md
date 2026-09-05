# Supabase Platform Setup

## What is implemented

- [migrations/20260905120000_anchor_schema.sql](migrations/20260905120000_anchor_schema.sql) creates the closed-community data model, RLS policies, append-only events, blocks/reports, and transactional match commands.
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

1. Create an approved Supabase project and enable the email verification flow appropriate for the demo.
2. Apply the migration to an empty development database.
3. Set the function secrets above through the Supabase dashboard or CLI.
4. Deploy `confirm-match` and `get-pickup-reveal`.
5. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally; use only a public anon key in browser configuration.
6. Seed only fictional demo users, zones, and public landmarks. The app works from `src/lib/demo-fixtures.ts` until these steps are complete.

## Mandatory validation after deployment

- Test two simultaneous final-seat accepts; only one must succeed.
- Confirm pickup detail is unavailable before confirmation, after cancellation, and after expiry.
- Confirm a user in another community cannot list or mutate any ride resource.
- Confirm driver cancellation creates a rescue-eligible request and rider cancellation does not.
- Inspect function logs: they must never include an authorization token, plaintext pickup detail, or real address.
