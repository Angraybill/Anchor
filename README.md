# PolyPassengers

PolyPassengers is a simple ride-coordination app for Cal Poly students.

It helps students find voluntary rides to important, time-sensitive commitments when they do not have a car or their original ride falls through. Examples include internships, clinical shifts, labs, airport departures, and late-night travel.

## How it works

1. A student who is already driving a route posts an open seat and broad locations.
2. Riders browse the available rides and join one that fits their trip.
3. The app immediately reserves the seat and updates the remaining seat count; no driver approval is required.

The app lets drivers and riders type recognizable location names, while using broad pickup and destination zones for matching and privacy. It is designed around planned voluntary carpools, not instant rides, payments, or gig driving.

## Local development

```bash
npm install
cp .env.example .env.local
npm start
```

Scan the Expo QR code with Expo Go, or use `npm run ios`, `npm run android`, or `npm run web`. The app uses a deterministic local demo client when Supabase is not configured.

The implementation uses Expo, React Native, TypeScript, and Supabase. When the Expo Supabase variables are present, the current ride screens read and write live rides; without them, the app uses local demo data. Authentication is intentionally not connected in this commit.

## Supabase backend

The current backend scope is rides only. It provides a public `rides` table for driver-posted rides, a `ride_passengers` table for immediate joins, and an atomic `join_ride` database function. Joining a ride is not a request workflow: an available seat is claimed immediately.

After installing the Supabase CLI and creating a project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Copy `.env.example` to `.env.local` and add the project URL and public anon key. The current rides MVP uses only the public key; do not put service-role keys or database passwords in the app.

### Email sign-in codes

The landing screen uses Supabase Auth email OTP: it requests an email with
`signInWithOtp` and exchanges the entered code with `verifyOtp`. Whether
Supabase sends a clickable magic link or a code is controlled by the **Magic
Link** email template, rather than the client request.

For hosted Supabase projects, copy the contents of
`supabase/templates/magic-link-otp.html` into **Authentication > Email
Templates > Magic Link** in the Supabase dashboard and save it. The template
must include `{{ .Token }}` and must not include `{{ .ConfirmationURL }}`.
This sends a code for the app's existing code-entry screen and avoids a
one-time link being consumed by an email security scanner.

For local Supabase CLI development, the same template is configured through
`supabase/config.toml`; restart the local Supabase stack after changing it.
