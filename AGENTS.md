# Project Guidance — Product Name TBD

## What we are building

This is a weekend-hackathon prototype for a closed, Cal Poly student-to-student ride network. The product’s working name is **Anchor**, but the final product name is still TBD. It coordinates voluntary carpools for fixed-time commitments when a student does not have a car or a ride falls through.

This is not a public rideshare marketplace, transportation provider, payment platform, or gig-driving service. The primary track is **10 Minutes Back**: reduce the time students lose restarting a failed ride search through group chats.

## Four-person ownership

Use the branch that matches your lane. If you are not on one of these branches, ask the team which lane you own before changing shared files.

### Person 1 — Experience

Branch: `anchor/experience`

Owns the app shell, navigation, global styles, responsive layout, reusable UI primitives, loading/empty/error states, dashboard composition, and visual demo polish.

Build first:

- Mobile-first shell with Today, Offer a route, and Safety navigation.
- Deadline cards, route-offer cards, match timeline, Rescue banner, pickup-reveal card, and state-specific panels.
- Explicit visual states: open, candidate, waiting on driver, waiting on rider, confirmed, canceled, rescue, no match, and completed.

Do not own:

- Supabase, migrations, RLS, authentication, environment files, realtime, or shared contracts.
- Matching logic, pickup-reveal conditions, or Rescue eligibility.

Acceptance checks: test at 375px and desktop width, keyboard navigation, focus/contrast, reduced motion, and a complete Jordan demo using local fixtures. Do not show home addresses; deadlines are more prominent than decorative maps.

### Person 2 — Rider/driver flow

Branch: `anchor/flow`

Owns rider request forms, driver route-offer forms, candidate presentation, input validation, fixture-backed matching adapters, and related unit tests.

Build first:

- Rider fields: pickup zone, destination zone, arrive-by time, flexibility, and preference tags.
- Driver fields: origin/destination zone, departure window, seats, maximum detour, and voluntary-route consent.
- Candidate cards with exactly two explanations: arrival slack and estimated detour.
- Clear waiting states and no-match states.

Reject empty/unsupported zones, past deadlines, invalid windows, negative flexibility, and invalid seat counts. Never show a candidate without a seat, deadline fit, detour fit, community membership, or clear block/report eligibility. Browser code uses shared adapters and never writes Supabase tables directly.

### Person 3 — Mutual handoff, Rescue, and trust

Branch: `anchor/rescue`

Owns confirmation, cancellation, Rescue mode, no-match, check-in, completion, report/block UI, match detail/timeline states, and user-facing safety copy.

Build first:

- Driver-offered, confirmed, canceled, Rescue-pending, no-match, and completed states.
- Public pickup landmark only after mutual acceptance.
- Driver cancellation that transitions the rider into Rescue mode.
- A bounded replacement offer without implying a guaranteed ride.
- Report/block access during confirmed and in-progress states.

Never show exact pickup text before confirmation, public phone numbers, ratings, open chat, payments, or continuous tracking. The safety copy must say the product cannot monitor trips or provide emergency response. Pickup details must display an expiry.

### Person 4 — Platform and Supabase

Branch: `anchor/platform`

Owns dependency/setup decisions, Supabase migrations, RLS, auth/session boundaries, seed data, Edge Functions, shared contracts, client adapters, realtime, command errors, event ledger, and deployment.

Build first:

- React/TypeScript + Supabase setup with `.env.example`; never commit secrets.
- Canonical types and deterministic fixtures for Jordan, Maya, Sam, and Alex.
- Tables/policies for users, pilot community, route offers, ride requests, matches, events, pickup reveals, and reports.
- Authenticated commands for offering a seat, accepting/declining, cancel-and-rescue, check-in, completion, and reporting.
- Atomic final-seat acceptance; concurrent accepts must never overbook.
- Realtime only for authorized request/match participants.

Platform acceptance checks: unauthorized users cannot access ride data; pickup details are hidden before confirmation; one of two simultaneous final-seat accepts wins; cancellation starts Rescue only while viable; Rescue candidates never receive prior pickup details; server session identity determines authorization, not client actor IDs.

## Shared product rules

- Riders and drivers are verified Cal Poly students in the same active pilot community. Verification is demo-only unless an approved provider is integrated.
- Drivers offer pre-existing voluntary routes; no student is treated as a gig driver.
- A ride requires mutual driver/rider acceptance. Never auto-assign a ride.
- Use coarse zones until mutual acceptance. Never expose home addresses, raw contact information, or live location to candidates.
- A canceled ride starts bounded Rescue only if the rider can still arrive on time.
- No payments, fares, tips, ratings, open chat, continuous tracking, background-check claims, or emergency-service claims in the MVP.
- Mock verification, route estimates, notifications, and moderation must be visibly labeled demo-only.

## Shared engineering rules

- Inspect the existing setup before adding dependencies or changing shared files.
- Use stable UUIDs and server-derived identity.
- Every match transition is an authenticated server-side command.
- Enforce authorization in Supabase policies and server commands; UI hiding is not security.
- Keep match events append-only and keep precise pickup values out of ordinary logs.
- Put route-provider, notification, verification, and secret credentials on the server only.
- Handle no-match, stale candidates, declined handoffs, expired offers, cancellations, provider failures, and report/block states deliberately.
- Every PR states the branch, files changed, commands run, unrun checks, screenshots/recording if relevant, and mock/demo behavior.

## Shared demo and verification

The demo is one short story:

1. Jordan creates a trip for a downtown clinic, arriving by 7:45 AM.
2. Maya offers an existing route with one seat.
3. Jordan and Maya mutually accept; a public pickup landmark appears.
4. Maya cancels; Jordan enters Rescue mode.
5. Sam offers a compatible route before the deadline.
6. Jordan accepts, both check in, and the trip completes.

Before merging, run the available typecheck, build, tests, and audit. Test the two-session mutual-acceptance flow, final-seat concurrency, pickup privacy/expiry, cancellation Rescue, mobile/desktop layouts, keyboard navigation, and clear error states. Report anything not run.
