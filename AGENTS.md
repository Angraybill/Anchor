# Agent Guidance

## Product basics

The product name is not decided. Use neutral language such as “the app” in UI copy and documentation until the team chooses a name.

The app helps Cal Poly students coordinate voluntary rides to fixed-time commitments when they do not have a car or an existing ride falls through.

The core flow is:

1. A rider creates a trip with pickup zone, destination zone, and arrival deadline.
2. A driver offers an existing route with an open seat.
3. The rider and driver both accept.
4. A public pickup landmark is revealed.
5. If the driver cancels, the rider can receive a compatible replacement offer.
6. The rider and driver check in and complete the trip.

Use coarse zones before acceptance. Never expose home addresses, exact pickup details, phone numbers, or live location to candidates.

## Four-person work

### Person 1 — Experience

Own the Expo app shell, tab navigation, React Native styles, reusable UI components, loading/empty/error states, and visual polish.

Build the dashboard, deadline cards, route cards, match timeline, Rescue banner, pickup card, and all major trip states.

Do not change Supabase setup, migrations, policies, authentication, shared contracts, or matching logic.

Check iOS and Android layouts, touch targets, contrast, safe areas, and reduced motion where supported. Expo web is useful as a preview but is not the primary product target.

### Person 2 — Rider and driver flow

Own rider trip forms, driver route forms, candidate presentation, validation, fixture matching, and related tests.

Build fields for zones, arrival deadlines, departure windows, flexibility, seats, detour limits, and ride preferences. Show why a candidate fits using arrival slack and estimated detour.

Reject empty or unsupported zones, past deadlines, invalid time windows, negative flexibility, and invalid seat counts. Use shared client adapters; do not write Supabase tables directly from components.

### Person 3 — Handoff, Rescue, and trust

Own mutual acceptance, cancellation, Rescue mode, no-match states, check-in, completion, report/block UI, match timelines, and safety copy.

Show pickup details only after both people accept. A cancellation should produce a clear Rescue state, not a generic error. Never imply that a replacement ride is guaranteed.

Do not add public ratings, open chat, payments, continuous tracking, or emergency-service claims.

### Person 4 — Platform and Supabase

Own Supabase setup, migrations, RLS, authentication/session boundaries, seed data, Edge Functions, shared types, client adapters, realtime, command errors, event history, and deployment.

Keep secrets out of the client and commit only `.env.example`. Keep match transitions server-side and authenticated. Reserve the final seat atomically so concurrent accepts cannot overbook a driver.

Ensure users can access only their community’s data and that pickup details are protected before acceptance and after expiry.

## Shared rules

- Drivers offer routes they already plan to take; this is not gig driving.
- A ride is never auto-assigned. Both participants must accept.
- Verification, route estimates, notifications, and moderation are demo behavior unless connected to a real approved provider; label them honestly.
- Keep match events auditable and do not put precise pickup values in ordinary logs.
- Handle no-match, stale offers, declined handoffs, expired offers, cancellation, provider failure, and report/block states.
- Preserve teammate changes and inspect existing code before changing shared files.

## Before handing off

Run the available typecheck, tests, Expo bundle, and audit. Test the two-person acceptance flow, final-seat concurrency, pickup privacy/expiry, cancellation Rescue, iOS/Android layouts, touch states, and error states. Report checks that were not run.
