# Anchor Build Plan

## The only demo loop that matters

```text
Jordan needs downtown clinic by 7:45 AM
  → Maya offers a route with one seat
  → both mutually accept
  → public pickup landmark unlocks
  → Maya cancels
  → Anchor finds Sam’s rescue offer
  → Jordan confirms, checks in, and arrives
```

If this loop is polished and truthful, it is enough to win attention. Everything else is secondary.

## Four-person ownership

| Owner | Area | Concrete deliverable | Does not own |
| --- | --- | --- | --- |
| 1 — Product/UI | Mobile web shell, onboarding, trip/request forms, route cards, design system | A rider can create an Anchor trip and understand candidate/confirmed/rescue states in under five seconds | Matching rules, DB policy, notification implementation |
| 2 — Matching/state | Offer/request APIs, state machine, atomic seat reservation, explainable candidate query | Two users cannot confirm the last seat; transitions emit an audit event | Visual styling, verification provider |
| 3 — Trust/rescue | Student-verification demo flow, privacy-gated pickup detail, cancel/rematch controls, report/block flow | Cancelled confirmed ride produces a privacy-safe rescue candidate set | Public maps, real emergency support |
| 4 — Platform/demo | Schema, RLS, seed data, realtime, route estimate adapter, deployment, instrumentation | Two-browser realtime demo with reliable seeded journeys | Product scope changes without team agreement |

## Team contracts

- Owner 4 publishes shared types for `RouteOffer`, `AnchorRequest`, `Match`, and `MatchEvent` before UI integration.
- Only Owner 4 changes migrations, authorization policies, environment templates, or deployment configuration.
- Owner 2 owns all state transitions; other features call commands rather than updating match rows directly.
- Owner 3 owns exact pickup-reveal visibility. No other component stores or logs exact pickup instructions.
- Owner 1 never needs a real map SDK to ship the demo; route displays use zones and an intentionally simulated route line.

## Six-hour implementation sequence

| Time | Team focus | Definition of done |
| --- | --- | --- |
| 0:00–0:35 | Foundation | Repo scaffold, deployment, theme, student/offer/request/match schema, RLS test |
| 0:35–1:45 | Parallel vertical slices | Rider creates request; driver creates offer; dashboard renders seeded candidates |
| 1:45–2:50 | Mutual handoff | Driver offer + rider accept flow reserves exactly one seat and reveals public pickup landmark |
| 2:50–3:45 | Rescue moment | Confirmed cancellation produces fresh rescue candidates and an in-app alert state |
| 3:45–4:40 | Trust pass | Verified-student UI, TTL pickup visibility, block/report, no-match state |
| 4:40–5:30 | Realism pass | Realtime second browser, loading/error/empty states, mobile layout, honest demo labels |
| 5:30–6:00 | Demo rehearsal | Run the exact story three times; record a backup video; freeze scope |

## Seeded demo narrative

Use one fictitious pilot community and four Cal Poly student demo accounts. Never use real student names, email addresses, home addresses, cars, or live location data.

| Student | Role in demo | Route / request | Reliability state |
| --- | --- | --- | --- |
| Jordan | Rider | Needs `Downtown clinic` by `7:45 AM`; pickup zone `North campus` | New student |
| Maya | First driver | Leaving `North campus` at `6:55 AM`, toward downtown, 1 seat, 8-minute max detour | Reliable |
| Sam | Rescue driver | Leaving `Campus core` at `7:05 AM`, toward downtown, 1 seat, 10-minute max detour | Reliable |
| Alex | Optional competing offer | Has insufficient time slack | Candidate filtered out with explainable reason |

The route engine may return deterministic fixtures:

```text
Maya → arrival slack 22 min · estimated detour 6 min · eligible
Sam  → arrival slack 9 min  · estimated detour 4 min · rescue eligible
Alex → arrival slack -3 min · ineligible
```

Label this clearly as **demo route estimates**. The architecture should let the fixture be replaced by a production route adapter without changing user-facing contracts.

## Non-negotiable demo polish

- The demo starts on a populated dashboard, not a sign-up screen.
- A judge always sees a deadline and the remaining arrival slack.
- Driver and rider views have visibly different permissions.
- Exact pickup is hidden before confirmation and shown only as a public landmark after it.
- Cancellation is intentional and triggers a clear Rescue mode; it is not a confusing error.
- Every state has an empty/loading/error message so the product never looks broken.
- The pitch says “voluntary verified student carpool,” never “Uber for Cal Poly.”

## Explicit cuts

Do not build payments, public route browsing, chat, direct messaging, continuous GPS, actual school SSO, background checks, real emergency dispatch, native mobile apps, calendar integrations, ratings, or general AI chat.

They make the product less trustworthy and reduce the chance that the core rescue loop works flawlessly.
