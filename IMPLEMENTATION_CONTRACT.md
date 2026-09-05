# Anchor Implementation Contract

This document is the integration boundary for all four branches. It is intentionally narrow: build this contract before adding optional features.

## Chosen implementation shape

```text
React + TypeScript + Vite + Tailwind
        │
        ▼
Supabase Auth + Postgres + RLS + Realtime
        │
        ▼
Edge Functions: match, confirm, cancel-and-rescue
        │
        ▼
Demo route-estimate adapter (deterministic fixture first)
```

Use a deterministic fixture route adapter for the first working demo. It returns documented detour and arrival-slack values. A real route provider may replace it only after the end-to-end demo is stable.

## Repository shape after scaffold

```text
src/
  app/                 app shell, routing, providers
  components/          reusable presentation primitives
  features/
    auth/              session and verified-student gate
    dashboard/         today view and active state
    requests/          rider request creation/listing
    offers/            driver route-offer creation/listing
    matches/           candidates, driver offer, rider acceptance
    rescue/            cancellation, recovery, no-match state
    trust/             pickup reveal, report/block, safety copy
  lib/
    contracts.ts       canonical types — platform owned
    client.ts          typed service adapters — platform owned
    demo-fixtures.ts   safe seeded demo data — platform owned
  styles/              tokens and global style — experience owned
supabase/
  migrations/          schema and RLS — platform owned
  functions/           server commands — platform owned
```

## Canonical types

```text
Student
  id, displayName, verificationState, communityId

RouteOffer
  id, driverId, communityId, originZone, destinationZone,
  departureStart, departureEnd, seatsOpen, maxDetourMinutes, status

AnchorRequest
  id, riderId, communityId, pickupZone, destinationZone,
  arriveBy, flexibilityMinutes, preferences, status

Match
  id, offerId, requestId, state, arrivalSlackMinutes,
  detourMinutes, explanation[], expiresAt

PickupReveal
  matchId, publicLandmark, visibleAfter, expiresAt

MatchEvent
  id, matchId, actorId, type, createdAt
```

Allowed values:

```text
verificationState: demo_verified | pending | suspended
offerStatus: active | paused | full | expired | cancelled
requestStatus: draft | open | matched | confirmed | rescue_pending | completed | cancelled | no_match
matchState: candidate | driver_offered | confirmed | declined | expired | cancelled | in_progress | completed
```

The implementation may add safe display-only fields, but may not change names or state meanings without a coordinated platform contract update.

## Required server commands

```text
createRouteOffer(input) → RouteOffer
createAnchorRequest(input) → AnchorRequest
listCandidates(requestId) → Match[]
offerSeat(matchId) → Match
acceptRide(matchId) → Match
declineMatch(matchId) → Match
cancelMatch(matchId, reason) → { match, rescueCandidates: Match[] }
checkIn(matchId) → Match
completeMatch(matchId) → Match
createSafetyReport(matchId, category) → ReportReceipt
```

Rules:

- Commands derive the actor from the authenticated session; no caller passes `driverId`, `riderId`, or participant role.
- `acceptRide` is the sole command that moves a match to `confirmed`, reserves a seat, and reveals the pickup landmark.
- Seat reservation uses one transaction and cannot allow `seatsOpen < 0`.
- `cancelMatch` never exposes the canceled driver’s exact pickup data in rescue candidates.
- The client may optimistically render state only after it can reconcile with the command result/realtime event.

## Demo fixture contract

All teams use these safe constants until Team 4 connects the database:

| ID | Display name | Role | Details |
| --- | --- | --- | --- |
| `student-jordan` | Jordan | Rider | Downtown clinic request, arrive by 7:45 AM |
| `student-maya` | Maya | Driver 1 | 6:55 AM downtown route, 1 seat, 6-minute detour, 22-minute slack |
| `student-sam` | Sam | Rescue driver | 7:05 AM downtown route, 1 seat, 4-minute detour, 9-minute slack |
| `student-alex` | Alex | Filtered driver | Same direction but insufficient arrival slack |

Allowed zones: `north-campus`, `campus-core`, `downtown`, `public-transit-hub`, `airport-terminal`.

Only this fixture may contain a pickup reveal: **“North Campus Library entrance”**. It is a public landmark, not a real address.

## Required screens

| Route / state | Owner | Purpose |
| --- | --- | --- |
| `/` dashboard | 1 | Clear current request, offer, candidate, confirmed, or rescue state |
| `/request/new` | 2 | Deadline-first rider request form |
| `/offer/new` | 2 | Driver’s voluntary route/seat form |
| `/matches/:id` | 3 | Mutual acceptance timeline and public pickup reveal |
| `/rescue/:requestId` | 3 | Cancellation recovery and no-match state |
| `/safety` | 3 | Plain-language safety boundary and report entry point |
| hidden/dev seed controls | 4 | Switch among Jordan/Maya/Sam demo sessions; never present as production UI |

## Acceptance boundary

The MVP succeeds if it makes one two-browser story real. It does not need actual mapping, route navigation, payment, SSO, SMS, persistent user profiles, or a public driver marketplace.
